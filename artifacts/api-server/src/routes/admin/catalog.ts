import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  productVariantsTable,
  productImagesTable,
  categoriesTable,
  brandsTable,
  cartItemsTable,
  orderItemsTable,
} from "@workspace/db";
import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requirePermission, writeAudit } from "../../lib/rbac";

const router: IRouter = Router();

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Keep product_images primary in sync when admin edits image links. */
async function syncAdminProductImages(productId: number, images: string[]) {
  const cleaned = images.map((u) => u.trim()).filter(Boolean);
  await db
    .update(productImagesTable)
    .set({ isPrimary: false })
    .where(eq(productImagesTable.productId, productId));

  if (!cleaned.length) return;

  const primary = cleaned[0];
  const thumb = cleaned[cleaned.length - 1] || primary;
  await db.insert(productImagesTable).values({
    productId,
    primaryImage: primary,
    thumbnail: thumb,
    originalPath: primary,
    largePath: primary,
    mediumPath: primary,
    width: 0,
    height: 0,
    mimeType: "image/*",
    source: "admin",
    verified: false,
    confidenceScore: "0",
    qualityScore: 0,
    isPrimary: true,
  });
}

// ── Categories ──────────────────────────────────────────────────────────────

router.get(
  "/categories",
  requirePermission("categories:read"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        productCount: count(productsTable.id),
      })
      .from(categoriesTable)
      .leftJoin(productsTable, eq(productsTable.categoryId, categoriesTable.id))
      .groupBy(categoriesTable.id)
      .orderBy(asc(categoriesTable.name));

    res.json(rows);
  },
);

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
});

router.post(
  "/categories",
  requirePermission("categories:write"),
  async (req, res): Promise<void> => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const slug = parsed.data.slug ?? slugify(parsed.data.name);
    const [created] = await db
      .insert(categoriesTable)
      .values({ name: parsed.data.name, slug })
      .returning();

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "category.create",
      resourceType: "category",
      resourceId: created.id,
    });

    res.status(201).json({ ...created, productCount: 0 });
  },
);

router.patch(
  "/categories/:id",
  requirePermission("categories:write"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = categorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(categoriesTable)
      .set({
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.slug || parsed.data.name
          ? { slug: parsed.data.slug ?? slugify(parsed.data.name!) }
          : {}),
      })
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "category.update",
      resourceType: "category",
      resourceId: id,
      metadata: parsed.data,
    });

    res.json(updated);
  },
);

router.delete(
  "/categories/:id",
  requirePermission("categories:write"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "category.delete",
      resourceType: "category",
      resourceId: id,
    });
    res.sendStatus(204);
  },
);

// ── Brands ──────────────────────────────────────────────────────────────────

router.get(
  "/brands",
  requirePermission("brands:read"),
  async (_req, res): Promise<void> => {
    const rows = await db.select().from(brandsTable).orderBy(asc(brandsTable.name));
    res.json(rows);
  },
);

const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
});

router.post(
  "/brands",
  requirePermission("brands:write"),
  async (req, res): Promise<void> => {
    const parsed = brandSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const slug = parsed.data.slug ?? slugify(parsed.data.name);
    const [created] = await db
      .insert(brandsTable)
      .values({ name: parsed.data.name, slug })
      .returning();

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "brand.create",
      resourceType: "brand",
      resourceId: created.id,
    });

    res.status(201).json(created);
  },
);

router.patch(
  "/brands/:id",
  requirePermission("brands:write"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = brandSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(brandsTable)
      .set({
        ...(parsed.data.name ? { name: parsed.data.name } : {}),
        ...(parsed.data.slug || parsed.data.name
          ? { slug: parsed.data.slug ?? slugify(parsed.data.name!) }
          : {}),
      })
      .where(eq(brandsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Brand not found" });
      return;
    }

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "brand.update",
      resourceType: "brand",
      resourceId: id,
      metadata: parsed.data,
    });

    res.json(updated);
  },
);

router.delete(
  "/brands/:id",
  requirePermission("brands:write"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(brandsTable).where(eq(brandsTable.id, id));
    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "brand.delete",
      resourceType: "brand",
      resourceId: id,
    });
    res.sendStatus(204);
  },
);

// ── Products ────────────────────────────────────────────────────────────────

router.get(
  "/products",
  requirePermission("products:read"),
  async (req, res): Promise<void> => {
    const {
      search,
      published,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, parseInt(limit, 10) || 20);
    const offset = (pageNum - 1) * pageSize;

    const conditions = [];
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
    if (published === "true") conditions.push(eq(productsTable.published, true));
    if (published === "false") conditions.push(eq(productsTable.published, false));

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          description: productsTable.description,
          basePrice: productsTable.basePrice,
          compareAtPrice: productsTable.compareAtPrice,
          images: productsTable.images,
          featured: productsTable.featured,
          published: productsTable.published,
          categoryId: productsTable.categoryId,
          brandId: productsTable.brandId,
          categoryName: categoriesTable.name,
          brandName: brandsTable.name,
          stockTotal: sql<number>`coalesce(sum(${productVariantsTable.stockCount}), 0)::int`,
          variantCount: count(productVariantsTable.id),
        })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
        .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId))
        .leftJoin(productVariantsTable, eq(productVariantsTable.productId, productsTable.id))
        .where(where)
        .groupBy(productsTable.id, categoriesTable.name, brandsTable.name)
        .orderBy(desc(productsTable.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(productsTable).where(where),
    ]);

    const total = totalRows[0]?.total ?? 0;
    res.json({
      products: rows.map((r) => ({
        ...r,
        basePrice: parseFloat(r.basePrice),
        compareAtPrice: r.compareAtPrice ? parseFloat(r.compareAtPrice) : null,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageSize),
    });
  },
);

router.get(
  "/products/:id",
  requirePermission("products:read"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const variants = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, id))
      .orderBy(asc(productVariantsTable.price));

    res.json({
      ...product,
      basePrice: parseFloat(product.basePrice),
      compareAtPrice: product.compareAtPrice
        ? parseFloat(product.compareAtPrice)
        : null,
      createdAt: product.createdAt.toISOString(),
      variants: variants.map((v) => ({
        ...v,
        price: parseFloat(v.price),
      })),
    });
  },
);

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  categoryId: z.number().int().nullable().optional(),
  brandId: z.number().int().nullable().optional(),
  basePrice: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().nullable().optional(),
  images: z
    .array(z.string())
    .optional()
    .transform((arr) =>
      arr === undefined
        ? undefined
        : arr.map((u) => u.trim()).filter(Boolean),
    ),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  externalId: z.string().nullable().optional(),
  variants: z
    .array(
      z.object({
        id: z.number().int().optional(),
        name: z.string().min(1),
        sku: z.string().min(1),
        price: z.number().nonnegative(),
        stockCount: z.number().int().nonnegative(),
        attributes: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
});

router.post(
  "/products",
  requirePermission("products:write"),
  async (req, res): Promise<void> => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const data = parsed.data;
    const images = data.images ?? [];
    const [created] = await db
      .insert(productsTable)
      .values({
        name: data.name,
        description: data.description,
        categoryId: data.categoryId ?? null,
        brandId: data.brandId ?? null,
        basePrice: String(data.basePrice.toFixed(2)),
        compareAtPrice:
          data.compareAtPrice != null ? String(data.compareAtPrice.toFixed(2)) : null,
        images,
        featured: data.featured ?? false,
        published: data.published ?? true,
        externalId: data.externalId ?? null,
      })
      .returning();

    if (data.variants?.length) {
      await db.insert(productVariantsTable).values(
        data.variants.map((v) => ({
          productId: created.id,
          name: v.name,
          sku: v.sku,
          price: String(v.price.toFixed(2)),
          stockCount: v.stockCount,
          attributes: v.attributes ?? {},
        })),
      );
    }

    if (images.length) {
      await syncAdminProductImages(created.id, images);
    }

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "product.create",
      resourceType: "product",
      resourceId: created.id,
    });

    const variants = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, created.id));

    res.status(201).json({
      ...created,
      basePrice: parseFloat(created.basePrice),
      compareAtPrice: created.compareAtPrice
        ? parseFloat(created.compareAtPrice)
        : null,
      createdAt: created.createdAt.toISOString(),
      variants: variants.map((v) => ({ ...v, price: parseFloat(v.price) })),
    });
  },
);

router.patch(
  "/products/:id",
  requirePermission("products:write"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const data = parsed.data;
    const [updated] = await db
      .update(productsTable)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.brandId !== undefined ? { brandId: data.brandId } : {}),
        ...(data.basePrice !== undefined
          ? { basePrice: String(data.basePrice.toFixed(2)) }
          : {}),
        ...(data.compareAtPrice !== undefined
          ? {
              compareAtPrice:
                data.compareAtPrice != null
                  ? String(data.compareAtPrice.toFixed(2))
                  : null,
            }
          : {}),
        ...(data.images !== undefined ? { images: data.images } : {}),
        ...(data.featured !== undefined ? { featured: data.featured } : {}),
        ...(data.published !== undefined ? { published: data.published } : {}),
        ...(data.externalId !== undefined ? { externalId: data.externalId } : {}),
      })
      .where(eq(productsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    if (data.images !== undefined) {
      await syncAdminProductImages(id, data.images);
    }

    if (data.variants) {
      for (const v of data.variants) {
        if (v.id) {
          await db
            .update(productVariantsTable)
            .set({
              name: v.name,
              sku: v.sku,
              price: String(v.price.toFixed(2)),
              stockCount: v.stockCount,
              ...(v.attributes ? { attributes: v.attributes } : {}),
            })
            .where(eq(productVariantsTable.id, v.id));
        } else {
          await db.insert(productVariantsTable).values({
            productId: id,
            name: v.name,
            sku: v.sku,
            price: String(v.price.toFixed(2)),
            stockCount: v.stockCount,
            attributes: v.attributes ?? {},
          });
        }
      }
    }

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "product.update",
      resourceType: "product",
      resourceId: id,
      metadata: { fields: Object.keys(data) },
    });

    const variants = await db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, id));

    res.json({
      ...updated,
      basePrice: parseFloat(updated.basePrice),
      compareAtPrice: updated.compareAtPrice
        ? parseFloat(updated.compareAtPrice)
        : null,
      createdAt: updated.createdAt.toISOString(),
      variants: variants.map((v) => ({ ...v, price: parseFloat(v.price) })),
    });
  },
);

router.delete(
  "/products/:id",
  requirePermission("products:write"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [product] = await db
      .select({ id: productsTable.id, name: productsTable.name })
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const variantIds = (
      await db
        .select({ id: productVariantsTable.id })
        .from(productVariantsTable)
        .where(eq(productVariantsTable.productId, id))
    ).map((v) => v.id);

    if (variantIds.length) {
      // Order history must stay intact, so a sold product can only be unpublished.
      const [sold] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(orderItemsTable)
        .where(inArray(orderItemsTable.productVariantId, variantIds));

      if ((sold?.total ?? 0) > 0) {
        res.status(409).json({
          error:
            "This product appears in existing orders and cannot be deleted. Unpublish it instead to remove it from the storefront.",
          orderItemCount: sold?.total ?? 0,
        });
        return;
      }

      await db
        .delete(cartItemsTable)
        .where(inArray(cartItemsTable.productVariantId, variantIds));
    }

    await db.delete(productsTable).where(eq(productsTable.id, id));

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "product.delete",
      resourceType: "product",
      resourceId: id,
      metadata: { name: product.name, variantCount: variantIds.length },
    });

    res.sendStatus(204);
  },
);

const bulkSchema = z.object({
  updates: z.array(
    z.object({
      id: z.number().int(),
      basePrice: z.number().optional(),
      featured: z.boolean().optional(),
      published: z.boolean().optional(),
      compareAtPrice: z.number().nullable().optional(),
    }),
  ),
});

router.post(
  "/products/bulk",
  requirePermission("products:write"),
  async (req, res): Promise<void> => {
    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    let updated = 0;
    for (const item of parsed.data.updates) {
      await db
        .update(productsTable)
        .set({
          ...(item.basePrice !== undefined
            ? { basePrice: String(item.basePrice.toFixed(2)) }
            : {}),
          ...(item.featured !== undefined ? { featured: item.featured } : {}),
          ...(item.published !== undefined ? { published: item.published } : {}),
          ...(item.compareAtPrice !== undefined
            ? {
                compareAtPrice:
                  item.compareAtPrice != null
                    ? String(item.compareAtPrice.toFixed(2))
                    : null,
              }
            : {}),
        })
        .where(eq(productsTable.id, item.id));
      updated += 1;
    }

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "product.bulk_update",
      resourceType: "product",
      metadata: { count: updated },
    });

    res.json({ updated });
  },
);

// ── Inventory ───────────────────────────────────────────────────────────────

router.get(
  "/inventory",
  requirePermission("inventory:read"),
  async (req, res): Promise<void> => {
    const { search, lowStock } = req.query as Record<string, string>;
    const threshold = parseInt(lowStock ?? "5", 10) || 5;

    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${productVariantsTable.sku} ilike ${"%" + search + "%"} or ${productsTable.name} ilike ${"%" + search + "%"})`,
      );
    }
    if (lowStock !== undefined && lowStock !== "") {
      conditions.push(sql`${productVariantsTable.stockCount} <= ${threshold}`);
    }

    const rows = await db
      .select({
        id: productVariantsTable.id,
        productId: productVariantsTable.productId,
        productName: productsTable.name,
        variantName: productVariantsTable.name,
        sku: productVariantsTable.sku,
        price: productVariantsTable.price,
        stockCount: productVariantsTable.stockCount,
      })
      .from(productVariantsTable)
      .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(productVariantsTable.stockCount))
      .limit(200);

    res.json(
      rows.map((r) => ({
        ...r,
        price: parseFloat(r.price),
      })),
    );
  },
);

const stockSchema = z.object({
  stockCount: z.number().int().nonnegative(),
});

router.patch(
  "/inventory/:variantId",
  requirePermission("inventory:write"),
  async (req, res): Promise<void> => {
    const variantId = parseInt(String(req.params.variantId), 10);
    if (isNaN(variantId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const parsed = stockSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(productVariantsTable)
      .set({ stockCount: parsed.data.stockCount })
      .where(eq(productVariantsTable.id, variantId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Variant not found" });
      return;
    }

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "inventory.update",
      resourceType: "product_variant",
      resourceId: variantId,
      metadata: { stockCount: parsed.data.stockCount },
    });

    res.json({ ...updated, price: parseFloat(updated.price) });
  },
);

export default router;
