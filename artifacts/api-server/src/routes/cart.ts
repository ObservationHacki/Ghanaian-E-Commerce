import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  cartSessionsTable,
  cartItemsTable,
  productVariantsTable,
  productsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  AddCartItemBody,
  UpdateCartItemBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildCart(sessionId: string) {
  // Ensure session exists
  let [session] = await db
    .select()
    .from(cartSessionsTable)
    .where(eq(cartSessionsTable.sessionId, sessionId))
    .limit(1);

  if (!session) {
    [session] = await db
      .insert(cartSessionsTable)
      .values({ sessionId })
      .returning();
  }

  const items = await db
    .select({
      id: cartItemsTable.id,
      productVariantId: cartItemsTable.productVariantId,
      quantity: cartItemsTable.quantity,
      unitPrice: productVariantsTable.price,
      productId: productsTable.id,
      productName: productsTable.name,
      productImage: sql<string | null>`${productsTable.images}[1]`,
      variantName: productVariantsTable.name,
      variantSku: productVariantsTable.sku,
      stockCount: productVariantsTable.stockCount,
    })
    .from(cartItemsTable)
    .innerJoin(productVariantsTable, eq(productVariantsTable.id, cartItemsTable.productVariantId))
    .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
    .where(eq(cartItemsTable.cartSessionId, session.id));

  const mappedItems = items.map((item) => ({
    ...item,
    unitPrice: parseFloat(item.unitPrice),
  }));

  const total = mappedItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const itemCount = mappedItems.reduce((sum, item) => sum + item.quantity, 0);

  return { sessionId, items: mappedItems, total, itemCount };
}

// GET /cart/:sessionId
router.get("/cart/:sessionId", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const cart = await buildCart(sessionId);
  res.json(cart);
});

// DELETE /cart/:sessionId — clear cart
router.delete("/cart/:sessionId", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const [session] = await db
    .select()
    .from(cartSessionsTable)
    .where(eq(cartSessionsTable.sessionId, sessionId))
    .limit(1);

  if (session) {
    await db
      .delete(cartItemsTable)
      .where(eq(cartItemsTable.cartSessionId, session.id));
  }

  res.sendStatus(204);
});

// POST /cart/:sessionId/items
router.post("/cart/:sessionId/items", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const parsed = AddCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { productVariantId, quantity } = parsed.data;

  // Ensure session
  let [session] = await db
    .select()
    .from(cartSessionsTable)
    .where(eq(cartSessionsTable.sessionId, sessionId))
    .limit(1);
  if (!session) {
    [session] = await db
      .insert(cartSessionsTable)
      .values({ sessionId })
      .returning();
  }

  // Check if item already exists
  const [existing] = await db
    .select()
    .from(cartItemsTable)
    .where(
      and(
        eq(cartItemsTable.cartSessionId, session.id),
        eq(cartItemsTable.productVariantId, productVariantId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(cartItemsTable)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItemsTable.id, existing.id));
  } else {
    await db
      .insert(cartItemsTable)
      .values({ cartSessionId: session.id, productVariantId, quantity });
  }

  const cart = await buildCart(sessionId);
  res.status(201).json(cart);
});

// PATCH /cart/:sessionId/items/:itemId
router.patch("/cart/:sessionId/items/:itemId", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const rawItemId = Array.isArray(req.params.itemId)
    ? req.params.itemId[0]
    : req.params.itemId;
  const itemId = parseInt(rawItemId, 10);

  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { quantity } = parsed.data;

  if (quantity <= 0) {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));
  } else {
    await db
      .update(cartItemsTable)
      .set({ quantity })
      .where(eq(cartItemsTable.id, itemId));
  }

  const cart = await buildCart(sessionId);
  res.json(cart);
});

// DELETE /cart/:sessionId/items/:itemId
router.delete("/cart/:sessionId/items/:itemId", async (req, res): Promise<void> => {
  const { sessionId } = req.params;
  const rawItemId = Array.isArray(req.params.itemId)
    ? req.params.itemId[0]
    : req.params.itemId;
  const itemId = parseInt(rawItemId, 10);

  await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));

  const cart = await buildCart(sessionId);
  res.json(cart);
});

export default router;
