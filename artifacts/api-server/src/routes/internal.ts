import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderStatusHistoryTable } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";
import { logger } from "../lib/logger";
import { releaseStockForOrder, shouldReleaseStockOnCancel } from "../lib/stock";

const router: IRouter = Router();

const DEFAULT_EXPIRY_HOURS = 24;

function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    res.status(503).json({ error: "CRON_SECRET is not configured" });
    return;
  }

  const cronHeader = req.headers["x-cron-secret"];
  const fromCronHeader = Array.isArray(cronHeader) ? cronHeader[0] : cronHeader;

  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.authorization;
  const fromBearer =
    typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : null;

  const provided = fromCronHeader || fromBearer;
  if (!provided || provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

async function expireUnpaidOrders(req: Request, res: Response): Promise<void> {
  const hoursRaw = Number(req.query.hours ?? process.env.UNPAID_ORDER_EXPIRY_HOURS);
  const hours =
    Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : DEFAULT_EXPIRY_HOURS;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const stale = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      paymentStatus: ordersTable.paymentStatus,
    })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.paymentMethod, "momo_manual"),
        eq(ordersTable.paymentStatus, "pending"),
        eq(ordersTable.status, "order_received"),
        lt(ordersTable.createdAt, cutoff),
      ),
    );

  let cancelled = 0;
  let stockReleased = 0;
  for (const order of stale) {
    const release = shouldReleaseStockOnCancel(order);

    await db.transaction(async (tx) => {
      await tx
        .update(ordersTable)
        .set({ status: "cancelled" })
        .where(eq(ordersTable.id, order.id));

      if (release) {
        await releaseStockForOrder(tx, order.id);
      }

      await tx.insert(orderStatusHistoryTable).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "cancelled",
        actorUserId: null,
        note: `Auto-cancelled: no MoMo reference within ${hours}h${
          release ? " — reserved stock released" : ""
        }`,
      });
    });

    cancelled += 1;
    if (release) stockReleased += 1;
  }

  logger.info(
    { cancelled, stockReleased, hours, cutoff: cutoff.toISOString() },
    "Expired unpaid MoMo orders",
  );
  res.json({
    cancelled,
    stockReleased,
    hours,
    cutoff: cutoff.toISOString(),
  });
}

/**
 * Cancel unpaid MoMo orders still awaiting a transaction reference.
 * - Manual / external: POST + Header X-Cron-Secret
 * - Vercel Cron: GET + Authorization: Bearer $CRON_SECRET
 */
router.post("/internal/expire-unpaid-orders", requireCronSecret, expireUnpaidOrders);
router.get("/internal/expire-unpaid-orders", requireCronSecret, expireUnpaidOrders);

export default router;
