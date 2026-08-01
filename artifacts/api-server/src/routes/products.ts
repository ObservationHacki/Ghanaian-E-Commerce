import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  productVariantsTable,
  productImagesTable,
  categoriesTable,
  brandsTable,
} from "@workspace/db";
import {
  eq,
  and,
  gte,
  lte,
  ilike,
  desc,
  asc,
  sql,
  count,
  inArray,
} from "drizzle-orm";

const router: IRouter = Router();

type ImageAsset = {
  primaryImage: string;
  thumbnail: string;
  largePath: string;
  mediumPath: string;
  width: number;
  height: number;
  verified: boolean;
};

// Mirrors the columns the list queries below actually project, rather than the
// whole table row — they select a joined subset, not $inferSelect.
type ProductSummaryRow = {
  id: number;
  name: string;
  description: string;
  basePrice: string;
  images: string[];
  categoryId: number | null;
  categoryName: string | null;
  brandId: number | null;
  brandName: string | null;
  variantCount: number;
};

function buildProductSummary(p: ProductSummaryRow, imageAssets: ImageAsset[] = []) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    basePrice: parseFloat(p.basePrice),
    images: p.images,
    imageAssets,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    brandId: p.brandId,
    brandName: p.brandName,
    inStock: p.variantCount > 0,
    variantCount: p.variantCount,
  };
}

async function loadPrimaryImageAssets(
  productIds: number[],
): Promise<Map<number, ImageAsset[]>> {
  const map = new Map<number, ImageAsset[]>();
  if (!productIds.length) return map;
  const rows = await db
    .select({
      productId: productImagesTable.productId,
      primaryImage: productImagesTable.primaryImage,
      thumbnail: productImagesTable.thumbnail,
      largePath: productImagesTable.largePath,
      mediumPath: productImagesTable.mediumPath,
      width: productImagesTable.width,
      height: productImagesTable.height,
      verified: productImagesTable.verified,
    })
    .from(productImagesTable)
    .where(
      and(
        inArray(productImagesTable.productId, productIds),
        eq(productImagesTable.isPrimary, true),
      ),
    );
  for (const row of rows) {
    const asset: ImageAsset = {
      primaryImage: row.primaryImage,
      thumbnail: row.thumbnail,
      largePath: row.largePath,
      mediumPath: row.mediumPath,
      width: row.width,
      height: row.height,
      verified: row.verified,
    };
    const list = map.get(row.productId) || [];
    list.push(asset);
    map.set(row.productId, list);
  }
  return map;
}

// GET /products/featured — must be before /products/:id
router.get("/products/featured", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      basePrice: productsTable.basePrice,
      images: productsTable.images,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      brandId: productsTable.brandId,
      brandName: brandsTable.name,
      variantCount: count(productVariantsTable.id),
      minPrice: sql<string>`min(${productVariantsTable.price})`,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId))
    .leftJoin(
      productVariantsTable,
      and(
        eq(productVariantsTable.productId, productsTable.id),
        gte(productVariantsTable.stockCount, 1)
      )
    )
    .where(and(eq(productsTable.featured, true), eq(productsTable.published, true)))
    .groupBy(
      productsTable.id,
      categoriesTable.name,
      brandsTable.name
    )
    .orderBy(desc(productsTable.createdAt))
    .limit(12);

  const assets = await loadPrimaryImageAssets(rows.map((r) => r.id));
  res.json(rows.map((r) => buildProductSummary(r, assets.get(r.id) || [])));
});

// GET /products
router.get("/products", async (req, res): Promise<void> => {
  const {
    category,
    brand,
    minPrice,
    maxPrice,
    sort = "newest",
    search,
    page = "1",
    limit = "20",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(100, parseInt(limit, 10) || 20);
  const offset = (pageNum - 1) * pageSize;

  const conditions = [eq(productsTable.published, true)];
  if (category) conditions.push(eq(categoriesTable.slug, category));
  if (brand) conditions.push(eq(brandsTable.slug, brand));
  if (minPrice) conditions.push(gte(productsTable.basePrice, minPrice));
  if (maxPrice) conditions.push(lte(productsTable.basePrice, maxPrice));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));

  const baseQuery = db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      basePrice: productsTable.basePrice,
      images: productsTable.images,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      brandId: productsTable.brandId,
      brandName: brandsTable.name,
      variantCount: count(productVariantsTable.id),
      minPrice: sql<string>`min(${productVariantsTable.price})`,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId))
    .leftJoin(productVariantsTable, eq(productVariantsTable.productId, productsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(productsTable.id, categoriesTable.name, brandsTable.name);

  let orderCol;
  if (sort === "price_asc") orderCol = asc(productsTable.basePrice);
  else if (sort === "price_desc") orderCol = desc(productsTable.basePrice);
  else orderCol = desc(productsTable.createdAt);

  const [products, totalRows] = await Promise.all([
    baseQuery
      .orderBy(orderCol)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(productsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId))
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  const total = totalRows[0]?.total ?? 0;

  const assets = await loadPrimaryImageAssets(products.map((p) => p.id));
  res.json({
    products: products.map((p) => buildProductSummary(p, assets.get(p.id) || [])),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / pageSize),
  });
});

// GET /products/:id
router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  const [productRow] = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      basePrice: productsTable.basePrice,
      images: productsTable.images,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      brandId: productsTable.brandId,
      brandName: brandsTable.name,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId))
    .where(and(eq(productsTable.id, id), eq(productsTable.published, true)))
    .limit(1);

  if (!productRow) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [variants, imageAssetsMap] = await Promise.all([
    db
      .select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.productId, id))
      .orderBy(productVariantsTable.price),
    loadPrimaryImageAssets([id]),
  ]);

  res.json({
    id: productRow.id,
    name: productRow.name,
    description: productRow.description,
    basePrice: parseFloat(productRow.basePrice),
    images: productRow.images,
    imageAssets: imageAssetsMap.get(id) || [],
    categoryId: productRow.categoryId,
    categoryName: productRow.categoryName,
    brandId: productRow.brandId,
    brandName: productRow.brandName,
    inStock: variants.some((v) => v.stockCount > 0),
    variants: variants.map((v) => ({
      ...v,
      price: parseFloat(v.price),
    })),
  });
});

// GET /products/:id/related
router.get("/products/:id/related", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  const [product] = await db
    .select({ categoryId: productsTable.categoryId })
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!product) {
    res.json([]);
    return;
  }

  const related = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      basePrice: productsTable.basePrice,
      images: productsTable.images,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      brandId: productsTable.brandId,
      brandName: brandsTable.name,
      variantCount: count(productVariantsTable.id),
      minPrice: sql<string>`min(${productVariantsTable.price})`,
      createdAt: productsTable.createdAt,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId))
    .leftJoin(productVariantsTable, eq(productVariantsTable.productId, productsTable.id))
    .where(
      and(
        product.categoryId ? eq(productsTable.categoryId, product.categoryId) : sql`true`,
        sql`${productsTable.id} != ${id}`,
        eq(productsTable.published, true),
      )
    )
    .groupBy(productsTable.id, categoriesTable.name, brandsTable.name)
    .limit(6);

  const assets = await loadPrimaryImageAssets(related.map((r) => r.id));
  res.json(related.map((r) => buildProductSummary(r, assets.get(r.id) || [])));
});

export default router;
