/**
 * One-off: increase all product + variant prices by a fixed amount (GHS).
 *
 *   pnpm --filter @workspace/scripts exec tsx ./src/catalog/bump-prices.ts
 *   pnpm --filter @workspace/scripts exec tsx ./src/catalog/bump-prices.ts -- --amount=1000
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

function parseAmount(argv: string[]): number {
  for (const arg of argv) {
    if (arg.startsWith("--amount=")) {
      return Number(arg.split("=")[1]) || 1000;
    }
  }
  return 1000;
}

async function main() {
  const amount = parseAmount(process.argv.slice(2));
  try {
    process.loadEnvFile(path.join(REPO_ROOT, ".env"));
  } catch {
    // ignore
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const { db, pool, productsTable, productVariantsTable } = await import(
    "@workspace/db"
  );
  const { sql } = await import("drizzle-orm");

  const sampleBefore = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      basePrice: productsTable.basePrice,
      compareAtPrice: productsTable.compareAtPrice,
    })
    .from(productsTable)
    .orderBy(productsTable.id)
    .limit(3);

  await db.execute(sql`
    UPDATE products
    SET
      base_price = base_price + ${amount},
      compare_at_price = CASE
        WHEN compare_at_price IS NOT NULL THEN compare_at_price + ${amount}
        ELSE NULL
      END
  `);

  await db.execute(sql`
    UPDATE product_variants
    SET price = price + ${amount}
  `);

  const sampleAfter = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      basePrice: productsTable.basePrice,
      compareAtPrice: productsTable.compareAtPrice,
    })
    .from(productsTable)
    .orderBy(productsTable.id)
    .limit(3);

  const variantSample = await db
    .select({
      id: productVariantsTable.id,
      productId: productVariantsTable.productId,
      price: productVariantsTable.price,
    })
    .from(productVariantsTable)
    .orderBy(productVariantsTable.id)
    .limit(3);

  const [{ count: productCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable);
  const [{ count: variantCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productVariantsTable);

  console.log(`Added GHS ${amount} to all prices.`);
  console.log(`Products: ${productCount}, variants: ${variantCount}`);
  console.log("Sample before:", sampleBefore);
  console.log("Sample after:", sampleAfter);
  console.log("Variant sample after:", variantSample);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
