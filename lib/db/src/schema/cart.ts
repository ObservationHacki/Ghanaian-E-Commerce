import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productVariantsTable } from "./products";

export const cartSessionsTable = pgTable("cart_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartItemsTable = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartSessionId: integer("cart_session_id")
    .notNull()
    .references(() => cartSessionsTable.id, { onDelete: "cascade" }),
  productVariantId: integer("product_variant_id")
    .notNull()
    .references(() => productVariantsTable.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCartSessionSchema = createInsertSchema(cartSessionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCartItemSchema = createInsertSchema(cartItemsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCartSession = z.infer<typeof insertCartSessionSchema>;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartSession = typeof cartSessionsTable.$inferSelect;
export type CartItem = typeof cartItemsTable.$inferSelect;
