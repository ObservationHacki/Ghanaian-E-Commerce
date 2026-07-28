import { Router, type IRouter } from "express";
import axios from "axios";
import crypto from "crypto";
import { db } from "@workspace/db";
import { paymentsTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  InitializePaystackPaymentBody,
  VerifyPaystackPaymentBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
const PAYSTACK_BASE = "https://api.paystack.co";

// POST /payments/paystack/initialize
router.post("/payments/paystack/initialize", async (req, res): Promise<void> => {
  const parsed = InitializePaystackPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { orderId, email } = parsed.data;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const amountKobo = Math.round(parseFloat(order.total) * 100);

  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const callbackUrl = `${proto}://${host}/checkout/paystack-callback?orderId=${orderId}`;

  const response = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      email,
      amount: amountKobo,
      currency: "GHS",
      callback_url: callbackUrl,
      reference: `KUMASI-${orderId}-${Date.now()}`,
      metadata: { orderId },
    },
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
    }
  );

  const { authorization_url, access_code, reference } = response.data.data;

  // Record payment attempt
  await db.insert(paymentsTable).values({
    orderId,
    provider: "paystack",
    status: "pending",
    reference,
    amount: order.total,
  });

  res.json({
    authorizationUrl: authorization_url,
    accessCode: access_code,
    reference,
  });
});

// POST /payments/paystack/verify
router.post("/payments/paystack/verify", async (req, res): Promise<void> => {
  const parsed = VerifyPaystackPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { reference, orderId } = parsed.data;

  const verifyResponse = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${reference}`,
    {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    }
  );

  const txData = verifyResponse.data.data;
  const success = txData.status === "success";

  // Update payment record
  await db
    .update(paymentsTable)
    .set({ status: success ? "paid" : "failed" })
    .where(eq(paymentsTable.reference, reference));

  // Update order status
  if (success) {
    await db
      .update(ordersTable)
      .set({ status: "payment_confirmed", paymentStatus: "paid" })
      .where(eq(ordersTable.id, orderId));
  }

  res.json({
    success,
    status: txData.status,
    orderId,
  });
});

// POST /payments/webhook/paystack
router.post("/payments/webhook/paystack", async (req, res): Promise<void> => {
  const signature = req.headers["x-paystack-signature"] as string;
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== signature) {
    req.log.warn("Invalid Paystack webhook signature");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const { event, data } = req.body as { event: string; data: Record<string, unknown> };
  req.log.info({ event }, "Paystack webhook received");

  if (event === "charge.success") {
    const reference = data.reference as string;
    const [payment] = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.reference, reference))
      .limit(1);

    if (payment) {
      await db
        .update(paymentsTable)
        .set({ status: "paid" })
        .where(eq(paymentsTable.id, payment.id));

      await db
        .update(ordersTable)
        .set({ status: "payment_confirmed", paymentStatus: "paid" })
        .where(eq(ordersTable.id, payment.orderId));
    }
  }

  res.json({ received: true });
});

export default router;
