/**
 * Sync local public/products/{id}.* files into products.images, and list gaps.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PUBLIC_DIR = path.join(REPO_ROOT, "artifacts/store/public/products");

try {
  process.loadEnvFile(path.join(REPO_ROOT, ".env"));
} catch {
  // ignore
}

const { db, pool, productsTable } = await import("@workspace/db");
const { eq } = await import("drizzle-orm");

const files = await fs.readdir(PUBLIC_DIR);
const byId = new Map<number, string>();
for (const file of files) {
  const m = file.match(/^(\d+)\.(jpe?g|png|webp)$/i);
  if (!m) continue;
  byId.set(Number(m[1]), `/products/${file}`);
}

const products = await db
  .select({
    id: productsTable.id,
    name: productsTable.name,
    images: productsTable.images,
  })
  .from(productsTable);

let synced = 0;
for (const product of products) {
  const local = byId.get(product.id);
  if (!local) continue;
  const current = product.images?.[0];
  if (current === local) continue;
  await db
    .update(productsTable)
    .set({ images: [local] })
    .where(eq(productsTable.id, product.id));
  synced += 1;
}

const missing = products.filter((p) => !byId.has(p.id));
console.log(`Local files: ${byId.size}`);
console.log(`DB synced:   ${synced}`);
console.log(`Still missing files: ${missing.length}`);
for (const p of missing) console.log(`  #${p.id} ${p.name}`);

await pool.end();
process.exit(missing.length ? 2 : 0);
