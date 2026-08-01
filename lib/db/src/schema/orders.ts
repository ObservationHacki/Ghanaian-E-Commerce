import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  timestamp,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { addressesTable } from "./addresses";
import { productVariantsTable } from "./products";
import { adminUsersTable } from "./admin";

export const orderStatusEnum = pgEnum("order_status", [
  "order_received",
  "payment_confirmed",
  "payment_on_delivery",
  "processing",
  "ready_for_dispatch",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method_type", [
  "paystack",
  "pay_on_delivery",
  "momo_manual",
]);

export const paymentStatusEnum = pgEnum("payment_status_type", [
  "pending",
  "paid",
  "failed",
  "awaiting_collection",
  "submitted",
  "verified",
]);

export const ordersTable = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id"), // nullable — Supabase auth UUID, guest checkout allowed
    status: orderStatusEnum("status").notNull().default("order_received"),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("momo_manual"),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    /** Snapshot at order create — subtotal + this fee = total. */
    deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    /** Delivery zone snapshot: accra | outside_accra */
    deliveryRegion: text("delivery_region"),
    addressId: integer("address_id").references(() => addressesTable.id),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    momoReference: text("momo_reference"),
    paymentSubmittedAt: timestamp("payment_submitted_at", { withTimezone: true }),
    paymentVerifiedAt: timestamp("payment_verified_at", { withTimezone: true }),
    paymentVerifiedBy: integer("payment_verified_by").references(
      () => adminUsersTable.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Postgres allows multiple NULLs under a unique index — only non-null refs collide.
    uniqueIndex("orders_momo_reference_uidx").on(table.momoReference),
  ],
);

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  productVariantId: integer("product_variant_id")
    .notNull()
    .references(() => productVariantsTable.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
});
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
