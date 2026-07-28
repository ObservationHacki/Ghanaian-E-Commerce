import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { addressesTable } from "./addresses";
import { productVariantsTable } from "./products";

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
]);

export const paymentStatusEnum = pgEnum("payment_status_type", [
  "pending",
  "paid",
  "failed",
  "awaiting_collection",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: text("user_id"), // nullable — Supabase auth UUID, guest checkout allowed
  status: orderStatusEnum("status").notNull().default("order_received"),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  addressId: integer("address_id").references(() => addressesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
