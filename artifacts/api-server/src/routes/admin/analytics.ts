import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  addressesTable,
  productsTable,
  productVariantsTable,
} from "@workspace/db";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { requirePermission } from "../../lib/rbac";

const router: IRouter = Router();

router.get(
  "/analytics/summary",
  requirePermission("analytics:read"),
  async (req, res): Promise<void> => {
    const { from, to } = req.query as Record<string, string>;
    const conditions = [
      sql`${ordersTable.status} != 'cancelled'`,
    ];
    if (from) conditions.push(gte(ordersTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(ordersTable.createdAt, new Date(to)));
    const where = and(...conditions);

    const [totals] = await db
      .select({
        orderCount: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(${ordersTable.total}), 0)`,
        aov: sql<string>`coalesce(avg(${ordersTable.total}), 0)`,
      })
      .from(ordersTable)
      .where(where);

    const byStatus = await db
      .select({
        status: ordersTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(ordersTable)
      .where(where)
      .groupBy(ordersTable.status);

    const byRegion = await db
      .select({
        region: addressesTable.region,
        count: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(${ordersTable.total}), 0)`,
      })
      .from(ordersTable)
      .leftJoin(addressesTable, eq(addressesTable.id, ordersTable.addressId))
      .where(where)
      .groupBy(addressesTable.region)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const bestsellers = await db
      .select({
        productId: productsTable.id,
        productName: productsTable.name,
        unitsSold: sql<number>`coalesce(sum(${orderItemsTable.quantity}), 0)::int`,
        revenue: sql<string>`coalesce(sum(${orderItemsTable.quantity} * ${orderItemsTable.unitPrice}), 0)`,
      })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
      .innerJoin(
        productVariantsTable,
        eq(productVariantsTable.id, orderItemsTable.productVariantId),
      )
      .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
      .where(where)
      .groupBy(productsTable.id, productsTable.name)
      .orderBy(desc(sql`sum(${orderItemsTable.quantity})`))
      .limit(10);

    const daily = await db
      .select({
        day: sql<string>`to_char(${ordersTable.createdAt}, 'YYYY-MM-DD')`,
        orderCount: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(${ordersTable.total}), 0)`,
      })
      .from(ordersTable)
      .where(where)
      .groupBy(sql`to_char(${ordersTable.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${ordersTable.createdAt}, 'YYYY-MM-DD')`)
      .limit(90);

    res.json({
      orderCount: totals?.orderCount ?? 0,
      revenue: parseFloat(totals?.revenue ?? "0"),
      aov: parseFloat(totals?.aov ?? "0"),
      byStatus,
      byRegion: byRegion.map((r) => ({
        region: r.region ?? "Unknown",
        count: r.count,
        revenue: parseFloat(r.revenue),
      })),
      bestsellers: bestsellers.map((b) => ({
        ...b,
        revenue: parseFloat(b.revenue),
      })),
      daily: daily.map((d) => ({
        day: d.day,
        orderCount: d.orderCount,
        revenue: parseFloat(d.revenue),
      })),
    });
  },
);

router.get(
  "/analytics/dashboard",
  requirePermission("dashboard:read"),
  async (_req, res): Promise<void> => {
    const [orderStats] = await db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(case when ${ordersTable.status} != 'cancelled' then ${ordersTable.total} else 0 end), 0)`,
        pendingOrders: sql<number>`count(*) filter (where ${ordersTable.status} in ('order_received', 'payment_on_delivery', 'processing'))::int`,
      })
      .from(ordersTable);

    const [productStats] = await db
      .select({
        productCount: sql<number>`count(*)::int`,
        unpublished: sql<number>`count(*) filter (where ${productsTable.published} = false)::int`,
      })
      .from(productsTable);

    const [lowStock] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(productVariantsTable)
      .where(sql`${productVariantsTable.stockCount} <= 5`);

    res.json({
      totalOrders: orderStats?.totalOrders ?? 0,
      revenue: parseFloat(orderStats?.revenue ?? "0"),
      pendingOrders: orderStats?.pendingOrders ?? 0,
      productCount: productStats?.productCount ?? 0,
      unpublishedProducts: productStats?.unpublished ?? 0,
      lowStockVariants: lowStock?.count ?? 0,
    });
  },
);

export default router;
