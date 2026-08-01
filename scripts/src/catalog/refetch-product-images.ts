/**
 * Clear images for specific product IDs (and same-model siblings), then the
 * main finder can pull better exterior product shots.
 *
 * Usage: tsx ./src/catalog/refetch-product-images.ts 167 74
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PUBLIC_DIR = path.join(REPO_ROOT, "artifacts/store/public/products");
const ids = process.argv.slice(2).map(Number).filter((n) => n > 0);
if (!ids.length) {
  console.error("Pass product ids, e.g. 167 74");
  process.exit(1);
}

try {
  process.loadEnvFile(path.join(REPO_ROOT, ".env"));
} catch {
  // ignore
}

const { db, pool, productsTable } = await import("@workspace/db");
const { eq } = await import("drizzle-orm");

for (const id of ids) {
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    await fs.unlink(path.join(PUBLIC_DIR, `${id}${ext}`)).catch(() => {});
  }
  await db.update(productsTable).set({ images: [] }).where(eq(productsTable.id, id));
  console.log(`cleared #${id}`);
}

// Also clear FX506 / Latitude 7400 siblings that may have copied the bad shot.
const products = await db
  .select({ id: productsTable.id, name: productsTable.name, images: productsTable.images })
  .from(productsTable);

for (const p of products) {
  if (ids.includes(p.id)) continue;
  const shouldClear =
    (ids.includes(167) && /FX506/i.test(p.name)) ||
    (ids.includes(74) && /7400/i.test(p.name) && /Dell/i.test(p.name));
  if (!shouldClear) continue;
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    await fs.unlink(path.join(PUBLIC_DIR, `${p.id}${ext}`)).catch(() => {});
  }
  await db.update(productsTable).set({ images: [] }).where(eq(productsTable.id, p.id));
  console.log(`cleared sibling #${p.id} ${p.name}`);
}

await pool.end();
