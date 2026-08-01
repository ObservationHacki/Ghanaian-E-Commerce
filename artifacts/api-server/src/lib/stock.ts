import { db } from "@workspace/db";
import { orderItemsTable, productVariantsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type StockLine = {
  productVariantId: number;
  quantity: number;
};

/** Decrement stock for each line. Returns false if any line lacks enough stock. */
export async function reserveStock(
  tx: Tx,
  lines: StockLine[],
): Promise<{ ok: true } | { ok: false; productVariantId: number }> {
  for (const line of lines) {
    const updated = await tx
      .update(productVariantsTable)
      .set({
        stockCount: sql`${productVariantsTable.stockCount} - ${line.quantity}`,
      })
      .where(
        and(
          eq(productVariantsTable.id, line.productVariantId),
          sql`${productVariantsTable.stockCount} >= ${line.quantity}`,
        ),
      )
      .returning({ id: productVariantsTable.id });

    if (updated.length === 0) {
      return { ok: false, productVariantId: line.productVariantId };
    }
  }
  return { ok: true };
}

/** Restore stock for all items on an order (idempotent caller must ensure once). */
export async function releaseStockForOrder(tx: Tx, orderId: number): Promise<void> {
  const items = await tx
    .select({
      productVariantId: orderItemsTable.productVariantId,
      quantity: orderItemsTable.quantity,
    })
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  for (const item of items) {
    await tx
      .update(productVariantsTable)
      .set({
        stockCount: sql`${productVariantsTable.stockCount} + ${item.quantity}`,
      })
      .where(eq(productVariantsTable.id, item.productVariantId));
  }
}

/** Unpaid reserved orders get stock back when cancelled. */
export function shouldReleaseStockOnCancel(order: {
  status: string;
  paymentStatus: string;
}): boolean {
  if (order.status === "cancelled") return false;
  return (
    order.paymentStatus === "pending" || order.paymentStatus === "submitted"
  );
}
