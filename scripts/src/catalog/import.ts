import path from "node:path";
import { existsSync } from "node:fs";
import ExcelJS from "exceljs";
import {
  PRODUCTS_SHEET,
  PRODUCT_HEADERS,
  REPO_ROOT,
  REQUIRED_PRODUCT_HEADERS,
  REQUIRED_VARIANT_HEADERS,
  SheetReader,
  VARIANTS_SHEET,
  VARIANT_HEADERS,
  parseAttributes,
  parseFlag,
  parseImages,
  parsePrice,
  parseStock,
  requireText,
  resolveUserPath,
  slugify,
  type FieldContext,
  type Issue,
} from "./workbook";

const DEFAULT_VARIANT_NAME = "Default";
const CHUNK_SIZE = 500;

type Options = {
  file: string;
  dryRun: boolean;
  allowPartial: boolean;
};

type ParsedProduct = {
  ref: string;
  productCode: string;
  name: string;
  description: string;
  categoryName: string;
  brandName: string;
  basePrice: string;
  stock: number;
  images: string[];
  featured: boolean;
};

type ParsedVariant = {
  ref: string;
  productCode: string;
  name: string;
  sku: string;
  price: string;
  stock: number;
  attributes: Record<string, string>;
};

function parseOptions(argv: string[]): Options {
  const options: Options = {
    file: "catalog.xlsx",
    dryRun: false,
    allowPartial: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--allow-partial") {
      options.allowPartial = true;
    } else if (arg === "--file") {
      const value = argv[index + 1];
      if (!value) throw new Error("--file needs a path");
      options.file = value;
      index += 1;
    } else if (arg.startsWith("--file=")) {
      options.file = arg.slice("--file=".length);
    } else if (!arg.startsWith("--")) {
      options.file = arg;
    } else {
      throw new Error(`unknown option "${arg}"`);
    }
  }

  return options;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function readProducts(worksheet: ExcelJS.Worksheet): {
  products: ParsedProduct[];
  issues: Issue[];
} {
  const reader = new SheetReader(
    PRODUCTS_SHEET,
    worksheet,
    PRODUCT_HEADERS,
    REQUIRED_PRODUCT_HEADERS,
  );
  const issues: Issue[] = [...reader.issues];
  const products: ParsedProduct[] = [];

  for (const rowNumber of reader.dataRowNumbers) {
    const context: FieldContext = {
      ref: reader.ref("product_code", rowNumber),
      issues,
    };

    const productCode = requireText(
      reader.value("product_code", rowNumber),
      "product_code",
      context,
    );

    const nameContext: FieldContext = {
      ref: reader.ref("name", rowNumber),
      issues,
    };
    const descriptionContext: FieldContext = {
      ref: reader.ref("description", rowNumber),
      issues,
    };
    const priceContext: FieldContext = {
      ref: reader.ref("base_price", rowNumber),
      issues,
    };
    const stockContext: FieldContext = {
      ref: reader.ref("stock", rowNumber),
      issues,
    };
    const imagesContext: FieldContext = {
      ref: reader.ref("images", rowNumber),
      issues,
    };
    const featuredContext: FieldContext = {
      ref: reader.ref("featured", rowNumber),
      issues,
    };

    products.push({
      ref: `${PRODUCTS_SHEET}!${rowNumber}`,
      productCode,
      name: requireText(reader.value("name", rowNumber), "name", nameContext),
      description: requireText(
        reader.value("description", rowNumber),
        "description",
        descriptionContext,
      ),
      categoryName: reader.value("category", rowNumber),
      brandName: reader.value("brand", rowNumber),
      basePrice: parsePrice(
        reader.value("base_price", rowNumber),
        "base_price",
        priceContext,
      ),
      stock: parseStock(reader.value("stock", rowNumber), "stock", stockContext),
      images: parseImages(reader.value("images", rowNumber), imagesContext),
      featured: parseFlag(
        reader.value("featured", rowNumber),
        "featured",
        featuredContext,
      ),
    });
  }

  return { products, issues };
}

function readVariants(worksheet: ExcelJS.Worksheet | undefined): {
  variants: ParsedVariant[];
  issues: Issue[];
} {
  if (!worksheet) return { variants: [], issues: [] };

  const reader = new SheetReader(
    VARIANTS_SHEET,
    worksheet,
    VARIANT_HEADERS,
    REQUIRED_VARIANT_HEADERS,
  );
  const issues: Issue[] = [...reader.issues];
  const variants: ParsedVariant[] = [];

  for (const rowNumber of reader.dataRowNumbers) {
    const codeContext: FieldContext = {
      ref: reader.ref("product_code", rowNumber),
      issues,
    };
    const nameContext: FieldContext = {
      ref: reader.ref("name", rowNumber),
      issues,
    };
    const skuContext: FieldContext = {
      ref: reader.ref("sku", rowNumber),
      issues,
    };
    const priceContext: FieldContext = {
      ref: reader.ref("price", rowNumber),
      issues,
    };
    const stockContext: FieldContext = {
      ref: reader.ref("stock", rowNumber),
      issues,
    };
    const attributesContext: FieldContext = {
      ref: reader.ref("attributes", rowNumber),
      issues,
    };

    variants.push({
      ref: `${VARIANTS_SHEET}!${rowNumber}`,
      productCode: requireText(
        reader.value("product_code", rowNumber),
        "product_code",
        codeContext,
      ),
      name: requireText(reader.value("name", rowNumber), "name", nameContext),
      sku: requireText(reader.value("sku", rowNumber), "sku", skuContext),
      price: parsePrice(reader.value("price", rowNumber), "price", priceContext),
      stock: parseStock(reader.value("stock", rowNumber), "stock", stockContext),
      attributes: parseAttributes(
        reader.value("attributes", rowNumber),
        attributesContext,
      ),
    });
  }

  return { variants, issues };
}

function crossValidate(
  products: ParsedProduct[],
  variants: ParsedVariant[],
): Issue[] {
  const issues: Issue[] = [];

  const seenCodes = new Map<string, string>();
  const duplicateRefs = new Set<string>();

  for (const product of products) {
    if (product.productCode === "") continue;

    const firstSeen = seenCodes.get(product.productCode);
    if (firstSeen) {
      duplicateRefs.add(product.ref);
      issues.push({
        ref: product.ref,
        message: `duplicate product_code "${product.productCode}", already used at ${firstSeen}`,
      });
    } else {
      seenCodes.set(product.productCode, product.ref);
    }
  }

  const withVariants = new Set<string>();
  for (const variant of variants) {
    if (variant.productCode === "") continue;

    if (!seenCodes.has(variant.productCode)) {
      issues.push({
        ref: variant.ref,
        message: `product_code "${variant.productCode}" has no matching row in the ${PRODUCTS_SHEET} sheet`,
      });
      continue;
    }

    withVariants.add(variant.productCode);
  }

  const seenSkus = new Map<string, string>();

  for (const variant of variants) {
    if (variant.sku === "") continue;

    const firstSeen = seenSkus.get(variant.sku);
    if (firstSeen) {
      issues.push({
        ref: variant.ref,
        message: `duplicate sku "${variant.sku}", already used at ${firstSeen}`,
      });
    } else {
      seenSkus.set(variant.sku, variant.ref);
    }
  }

  // Products without their own variant rows get one generated from the product
  // code, so that code has to stay clear of the explicit SKUs too.
  for (const product of products) {
    if (
      product.productCode === "" ||
      withVariants.has(product.productCode) ||
      duplicateRefs.has(product.ref)
    ) {
      continue;
    }

    const firstSeen = seenSkus.get(product.productCode);
    if (firstSeen) {
      issues.push({
        ref: product.ref,
        message: `product_code "${product.productCode}" is also used as a sku at ${firstSeen}. It becomes this product's default sku, so the two collide.`,
      });
    } else {
      seenSkus.set(product.productCode, product.ref);
    }
  }

  return issues;
}

function reportIssues(issues: Issue[]) {
  console.error(`Found ${issues.length} problem${issues.length === 1 ? "" : "s"}:`);
  console.error("");
  for (const issue of issues) {
    console.error(`  ${issue.ref}: ${issue.message}`);
  }
  console.error("");
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const filePath = resolveUserPath(options.file, existsSync);

  if (!existsSync(filePath)) {
    console.error(`No such file: ${filePath}`);
    console.error("Run `pnpm run catalog:template` to generate a starting workbook.");
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const productsSheet = workbook.getWorksheet(PRODUCTS_SHEET);

  if (!productsSheet) {
    console.error(`The workbook has no "${PRODUCTS_SHEET}" sheet.`);
    console.error("Run `pnpm run catalog:template` to see the expected layout.");
    process.exit(1);
  }

  const { products, issues: productIssues } = readProducts(productsSheet);
  const { variants, issues: variantIssues } = readVariants(
    workbook.getWorksheet(VARIANTS_SHEET),
  );
  const issues = [
    ...productIssues,
    ...variantIssues,
    ...crossValidate(products, variants),
  ];

  if (issues.length > 0) {
    reportIssues(issues);

    if (!options.allowPartial) {
      console.error("Nothing was written. Fix the rows above, or re-run with --allow-partial.");
      process.exit(1);
    }

    console.error("Continuing anyway because --allow-partial was passed.");
  }

  const brokenRefs = new Set(issues.map((issue) => issue.ref));
  const usableProducts = products.filter(
    (product) => product.productCode !== "" && !brokenRefs.has(product.ref),
  );
  const usableCodes = new Set(usableProducts.map((product) => product.productCode));
  const usableVariants = variants.filter(
    (variant) =>
      variant.sku !== "" &&
      !brokenRefs.has(variant.ref) &&
      usableCodes.has(variant.productCode),
  );

  if (usableProducts.length === 0) {
    console.error("No usable product rows found.");
    process.exit(1);
  }

  const categoryNames = [
    ...new Set(
      usableProducts.map((product) => product.categoryName).filter((name) => name !== ""),
    ),
  ];
  const brandNames = [
    ...new Set(
      usableProducts.map((product) => product.brandName).filter((name) => name !== ""),
    ),
  ];

  if (options.dryRun) {
    console.log("Dry run — nothing was written.");
    console.log("");
    console.log(`  products    ${usableProducts.length}`);
    console.log(`  variants    ${usableVariants.length} explicit`);
    console.log(
      `              ${usableProducts.length - new Set(usableVariants.map((v) => v.productCode)).size} generated as defaults`,
    );
    console.log(`  categories  ${categoryNames.length} (${categoryNames.join(", ") || "none"})`);
    console.log(`  brands      ${brandNames.length} (${brandNames.join(", ") || "none"})`);
    return;
  }

  // The db package opens a pool the moment it is imported and needs
  // DATABASE_URL, so the environment has to be in place first.
  try {
    process.loadEnvFile(path.join(REPO_ROOT, ".env"));
  } catch {
    // no .env file — fall through to the real environment
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env at the repo root.");
    process.exit(1);
  }

  const {
    db,
    pool,
    brandsTable,
    cartItemsTable,
    categoriesTable,
    orderItemsTable,
    productVariantsTable,
    productsTable,
    insertProductSchema,
    insertProductVariantSchema,
  } = await import("@workspace/db");
  const { eq, inArray, sql } = await import("drizzle-orm");

  let created = 0;
  let updated = 0;
  let variantsWritten = 0;
  let variantsRemoved = 0;
  let variantsRetired = 0;

  try {
    await db.transaction(async (tx) => {
      const categoryIds = new Map<string, number>();

      if (categoryNames.length > 0) {
        const rows = await tx
          .insert(categoriesTable)
          .values(
            categoryNames.map((name) => ({ name, slug: slugify(name) })),
          )
          .onConflictDoUpdate({
            target: categoriesTable.slug,
            set: { name: sql`excluded.name` },
          })
          .returning({ id: categoriesTable.id, slug: categoriesTable.slug });

        for (const row of rows) categoryIds.set(row.slug, row.id);
      }

      const brandIds = new Map<string, number>();

      if (brandNames.length > 0) {
        const rows = await tx
          .insert(brandsTable)
          .values(brandNames.map((name) => ({ name, slug: slugify(name) })))
          .onConflictDoUpdate({
            target: brandsTable.slug,
            set: { name: sql`excluded.name` },
          })
          .returning({ id: brandsTable.id, slug: brandsTable.slug });

        for (const row of rows) brandIds.set(row.slug, row.id);
      }

      const codes = usableProducts.map((product) => product.productCode);
      const existingProducts = new Set<string>();

      for (const batch of chunk(codes, CHUNK_SIZE)) {
        const rows = await tx
          .select({ externalId: productsTable.externalId })
          .from(productsTable)
          .where(inArray(productsTable.externalId, batch));

        for (const row of rows) {
          if (row.externalId) existingProducts.add(row.externalId);
        }
      }

      const productIds = new Map<string, number>();

      for (const batch of chunk(usableProducts, CHUNK_SIZE)) {
        const values = batch.map((product) => {
          const payload = {
            externalId: product.productCode,
            name: product.name,
            description: product.description,
            categoryId:
              product.categoryName === ""
                ? null
                : (categoryIds.get(slugify(product.categoryName)) ?? null),
            brandId:
              product.brandName === ""
                ? null
                : (brandIds.get(slugify(product.brandName)) ?? null),
            basePrice: product.basePrice,
            images: product.images,
            featured: product.featured,
          };

          const validated = insertProductSchema.safeParse(payload);

          if (!validated.success) {
            throw new Error(
              `${product.ref}: ${validated.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`,
            );
          }

          return payload;
        });

        const rows = await tx
          .insert(productsTable)
          .values(values)
          .onConflictDoUpdate({
            target: productsTable.externalId,
            set: {
              name: sql`excluded.name`,
              description: sql`excluded.description`,
              categoryId: sql`excluded.category_id`,
              brandId: sql`excluded.brand_id`,
              basePrice: sql`excluded.base_price`,
              images: sql`excluded.images`,
              featured: sql`excluded.featured`,
            },
          })
          .returning({
            id: productsTable.id,
            externalId: productsTable.externalId,
          });

        for (const row of rows) {
          if (row.externalId) productIds.set(row.externalId, row.id);
        }
      }

      created = codes.filter((code) => !existingProducts.has(code)).length;
      updated = codes.length - created;

      const variantsByCode = new Map<string, ParsedVariant[]>();
      for (const variant of usableVariants) {
        const list = variantsByCode.get(variant.productCode) ?? [];
        list.push(variant);
        variantsByCode.set(variant.productCode, list);
      }

      const desiredVariants: Array<{
        ref: string;
        productId: number;
        name: string;
        sku: string;
        price: string;
        stockCount: number;
        attributes: Record<string, string>;
      }> = [];

      for (const product of usableProducts) {
        const productId = productIds.get(product.productCode);
        if (productId === undefined) continue;

        const explicit = variantsByCode.get(product.productCode);

        if (explicit && explicit.length > 0) {
          for (const variant of explicit) {
            desiredVariants.push({
              ref: variant.ref,
              productId,
              name: variant.name,
              sku: variant.sku,
              price: variant.price,
              stockCount: variant.stock,
              attributes: variant.attributes,
            });
          }
          continue;
        }

        desiredVariants.push({
          ref: product.ref,
          productId,
          name: DEFAULT_VARIANT_NAME,
          sku: product.productCode,
          price: product.basePrice,
          stockCount: product.stock,
          attributes: {},
        });
      }

      for (const batch of chunk(desiredVariants, CHUNK_SIZE)) {
        const values = batch.map((variant) => {
          const payload = {
            productId: variant.productId,
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            stockCount: variant.stockCount,
            attributes: variant.attributes,
          };

          const validated = insertProductVariantSchema.safeParse(payload);

          if (!validated.success) {
            throw new Error(
              `${variant.ref}: ${validated.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`,
            );
          }

          return payload;
        });

        await tx
          .insert(productVariantsTable)
          .values(values)
          .onConflictDoUpdate({
            target: productVariantsTable.sku,
            set: {
              productId: sql`excluded.product_id`,
              name: sql`excluded.name`,
              price: sql`excluded.price`,
              stockCount: sql`excluded.stock_count`,
              attributes: sql`excluded.attributes`,
            },
          });
      }

      variantsWritten = desiredVariants.length;

      // Variants that vanished from the sheet. Carts and orders reference
      // variants without ON DELETE rules, so anything still referenced is
      // taken out of stock rather than deleted.
      const touchedProductIds = [...productIds.values()];
      const keptSkus = new Set(desiredVariants.map((variant) => variant.sku));
      const staleIds: number[] = [];

      for (const batch of chunk(touchedProductIds, CHUNK_SIZE)) {
        const rows = await tx
          .select({ id: productVariantsTable.id, sku: productVariantsTable.sku })
          .from(productVariantsTable)
          .where(inArray(productVariantsTable.productId, batch));

        for (const row of rows) {
          if (!keptSkus.has(row.sku)) staleIds.push(row.id);
        }
      }

      if (staleIds.length > 0) {
        const referenced = new Set<number>();

        for (const batch of chunk(staleIds, CHUNK_SIZE)) {
          const inCarts = await tx
            .select({ id: cartItemsTable.productVariantId })
            .from(cartItemsTable)
            .where(inArray(cartItemsTable.productVariantId, batch));
          const inOrders = await tx
            .select({ id: orderItemsTable.productVariantId })
            .from(orderItemsTable)
            .where(inArray(orderItemsTable.productVariantId, batch));

          for (const row of [...inCarts, ...inOrders]) referenced.add(row.id);
        }

        const deletable = staleIds.filter((id) => !referenced.has(id));
        const retirable = staleIds.filter((id) => referenced.has(id));

        for (const batch of chunk(deletable, CHUNK_SIZE)) {
          await tx
            .delete(productVariantsTable)
            .where(inArray(productVariantsTable.id, batch));
        }

        for (const batch of chunk(retirable, CHUNK_SIZE)) {
          await tx
            .update(productVariantsTable)
            .set({ stockCount: 0 })
            .where(inArray(productVariantsTable.id, batch));
        }

        variantsRemoved = deletable.length;
        variantsRetired = retirable.length;
      }

      const [{ total } = { total: 0 }] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(productsTable)
        .where(eq(productsTable.featured, true));

      if (total === 0) {
        console.warn(
          'No products are marked featured, so the homepage Featured section will be empty. Set featured to "yes" on a few rows.',
        );
      }
    });
  } finally {
    await pool.end();
  }

  console.log("Import complete.");
  console.log("");
  console.log(`  products created   ${created}`);
  console.log(`  products updated   ${updated}`);
  console.log(`  variants written   ${variantsWritten}`);
  if (variantsRemoved > 0) console.log(`  variants removed   ${variantsRemoved}`);
  if (variantsRetired > 0) {
    console.log(
      `  variants retired   ${variantsRetired} (kept at 0 stock, still referenced by a cart or order)`,
    );
  }
  console.log(`  categories         ${categoryNames.length}`);
  console.log(`  brands             ${brandNames.length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
