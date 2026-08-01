import {
  pgTable,
  text,
  serial,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { brandsTable } from "./brands";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  // Stable key owned by whatever populates the catalog (currently the
  // spreadsheet importer) so re-imports update rows instead of duplicating
  // them, and renaming a product does not orphan it.
  externalId: text("external_id").unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  brandId: integer("brand_id").references(() => brandsTable.id),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }),
  images: text("images").array().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  stockCount: integer("stock_count").notNull().default(0),
  attributes: jsonb("attributes").notNull().default({}),
});

/** Verified, locally stored product photos with multiple WebP sizes. */
export const productImagesTable = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  /** Public path used as the default display image (large.webp). */
  primaryImage: text("primary_image").notNull(),
  thumbnail: text("thumbnail").notNull(),
  originalPath: text("original_path").notNull(),
  largePath: text("large_path").notNull(),
  mediumPath: text("medium_path").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  mimeType: text("mime_type").notNull().default("image/webp"),
  source: text("source").notNull().default(""),
  verified: boolean("verified").notNull().default(false),
  confidenceScore: numeric("confidence_score", { precision: 4, scale: 3 })
    .notNull()
    .default("0"),
  qualityScore: integer("quality_score").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
});
export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({
  id: true,
});
export const insertProductImageSchema = createInsertSchema(productImagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;
export type Product = typeof productsTable.$inferSelect;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
export type ProductImage = typeof productImagesTable.$inferSelect;
