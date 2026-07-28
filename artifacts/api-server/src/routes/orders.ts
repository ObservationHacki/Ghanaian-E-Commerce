import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  addressesTable,
  cartSessionsTable,
  cartItemsTable,
  productVariantsTable,
  productsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CreateOrderBody } from "@workspace/api-zod";

const router: IRouter = Router();

function getUserId(req: import("express").Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.sub as string;
  } catch {
    return null;
  }
}

async function buildOrderResponse(orderId: number) {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) return null;

  const [address] = order.addressId
    ? await db
        .select()
        .from(addressesTable)
        .where(eq(addressesTable.id, order.addressId))
        .limit(1)
    : [null];

  const items = await db
    .select({
      id: orderItemsTable.id,
      productVariantId: orderItemsTable.productVariantId,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      productName: productsTable.name,
      productImage: sql<string | null>`${productsTable.images}[1]`,
      variantName: productVariantsTable.name,
    })
    .from(orderItemsTable)
    .innerJoin(productVariantsTable, eq(productVariantsTable.id, orderItemsTable.productVariantId))
    .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
    .where(eq(orderItemsTable.orderId, orderId));

  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: parseFloat(order.total),
    userId: order.userId,
    createdAt: order.createdAt.toISOString(),
    address: address
      ? {
          ...address,
          lat: address.lat ? parseFloat(address.lat) : null,
          lng: address.lng ? parseFloat(address.lng) : null,
        }
      : null,
    items: items.map((i) => ({
      ...i,
      unitPrice: parseFloat(i.unitPrice),
    })),
  };
}

// GET /users/me/orders — must be declared before /orders/:id
router.get("/users/me/orders", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(ordersTable.createdAt);

  const results = await Promise.all(orders.map((o) => buildOrderResponse(o.id)));
  res.json(results.filter(Boolean));
});

// POST /orders
router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sessionId, address, paymentMethod, userId: bodyUserId } = parsed.data;
  const authUserId = getUserId(req);
  const userId = authUserId ?? bodyUserId ?? null;

  // Get cart items
  const [session] = await db
    .select()
    .from(cartSessionsTable)
    .where(eq(cartSessionsTable.sessionId, sessionId))
    .limit(1);

  if (!session) {
    res.status(400).json({ error: "Cart session not found" });
    return;
  }

  const cartItems = await db
    .select({
      id: cartItemsTable.id,
      productVariantId: cartItemsTable.productVariantId,
      quantity: cartItemsTable.quantity,
      price: productVariantsTable.price,
      stockCount: productVariantsTable.stockCount,
    })
    .from(cartItemsTable)
    .innerJoin(productVariantsTable, eq(productVariantsTable.id, cartItemsTable.productVariantId))
    .where(eq(cartItemsTable.cartSessionId, session.id));

  if (cartItems.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const total = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  // Create address
  const [savedAddress] = await db
    .insert(addressesTable)
    .values({
      userId: userId ?? null,
      digitalAddress: address.digitalAddress,
      notes: address.notes ?? null,
      lat: address.lat != null ? String(address.lat) : null,
      lng: address.lng != null ? String(address.lng) : null,
    })
    .returning();

  // Determine initial payment status
  const initialStatus =
    paymentMethod === "pay_on_delivery" ? "awaiting_collection" : "pending";
  const initialOrderStatus =
    paymentMethod === "pay_on_delivery" ? "payment_on_delivery" : "order_received";

  // Create order
  const [order] = await db
    .insert(ordersTable)
    .values({
      userId,
      status: initialOrderStatus as typeof ordersTable.$inferInsert["status"],
      paymentMethod: paymentMethod as typeof ordersTable.$inferInsert["paymentMethod"],
      paymentStatus: initialStatus as typeof ordersTable.$inferInsert["paymentStatus"],
      total: String(total.toFixed(2)),
      addressId: savedAddress.id,
    })
    .returning();

  // Create order items
  await db.insert(orderItemsTable).values(
    cartItems.map((item) => ({
      orderId: order.id,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitPrice: item.price,
    }))
  );

  // Clear cart
  await db.delete(cartItemsTable).where(eq(cartItemsTable.cartSessionId, session.id));

  const result = await buildOrderResponse(order.id);
  res.status(201).json(result);
});

// GET /orders/:id
router.get("/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }

  const result = await buildOrderResponse(id);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(result);
});

export default router;
