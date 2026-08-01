/**
 * For products still missing images, copy a local photo from the same model
 * family (e.g. all FX506 configs share one TUF F15 shot). Falls back to the
 * image finder queries only when no sibling exists.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PUBLIC_DIR = path.join(REPO_ROOT, "artifacts/store/public/products");

function modelKey(name: string, brand: string | null): string {
  const parts = name.split(/\s*·\s*/).map((p) => p.trim());
  let b = brand || parts[0] || "";
  let model = (parts[1] || "").toLowerCase();

  if (/omen|pavilion\s*[5-9]/i.test(model) && /asus/i.test(b)) b = "HP";

  // Normalize family keys so configs of the same chassis share one photo.
  model = model
    .replace(/gt\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/fx506/i.test(model)) return "asus:fx506";
  if (/fx507/i.test(model)) return "asus:fx507";
  if (/fx608|fa608|tianxuan/i.test(model)) return "asus:fx608";
  if (/fx95/i.test(model)) return "asus:fx95";
  if (/tuf-fx80|fx80/i.test(model)) return "asus:fx80";
  if (/tuf-fx63|fx63/i.test(model)) return "asus:fx63";
  if (/rog striker|striker 9/i.test(model)) return "asus:rog-scar";
  if (/wuwei m1502/i.test(model)) return "asus:vivobook15";
  if (/wuwei m1607/i.test(model)) return "asus:vivobook16";
  if (/wuwei pro14/i.test(model)) return "asus:vivobook-pro14";
  if (/omen 9|pavilion 9/i.test(model)) return "hp:omen16";
  if (/omen 8|pavilion 8/i.test(model)) return "hp:omen16";
  if (/omen 7|pavilion 7/i.test(model)) return "hp:omen15";
  if (/omen 6|pavilion 6/i.test(model)) return "hp:omen15";
  if (/omen 5|pavilion 5/i.test(model)) return "hp:pavilion-gaming15";
  if (/x360-1040/i.test(model)) return "hp:x360-1040";
  if (/x360-1030/i.test(model)) return "hp:x360-1030";
  if (/x360-830/i.test(model)) return "hp:x360-830";
  if (/zbook15 g8/i.test(model)) return "hp:zbook15-g8";
  if (/zbook15 g7/i.test(model)) return "hp:zbook15-g7";
  if (/840g10/i.test(model)) return "hp:840g10";
  if (/840g8/i.test(model)) return "hp:840g8";
  if (/840g7/i.test(model)) return "hp:840g7";
  if (/840g6/i.test(model)) return "hp:840g6";
  if (/840g5/i.test(model)) return "hp:840g5";
  if (/860g10/i.test(model)) return "hp:860g10";
  if (/850g8/i.test(model)) return "hp:850g8";
  if (/850g7/i.test(model)) return "hp:850g7";
  if (/830g7/i.test(model)) return "hp:830g7";
  if (/830g6/i.test(model)) return "hp:830g6";
  if (/640g/i.test(model)) return "hp:640";
  if (/830g/i.test(model)) return "hp:830";
  if (/x1c/i.test(model)) return "lenovo:x1c";
  if (/\bx13\b/i.test(model)) return "lenovo:x13";
  if (/t14s/i.test(model)) return "lenovo:t14s";
  if (/\bt14\b/i.test(model)) return "lenovo:t14";
  if (/t480/i.test(model)) return "lenovo:t480";
  if (/\bl13\b/i.test(model)) return "lenovo:l13";
  if (/5420/i.test(model)) return "dell:5420";
  if (/7400/i.test(model)) return "dell:7400";

  return `${b.toLowerCase()}:${model}`;
}

try {
  process.loadEnvFile(path.join(REPO_ROOT, ".env"));
} catch {
  // ignore
}

const { db, pool, productsTable, brandsTable } = await import("@workspace/db");
const { eq } = await import("drizzle-orm");

const files = await fs.readdir(PUBLIC_DIR);
const fileById = new Map<number, string>();
for (const file of files) {
  const m = file.match(/^(\d+)\.(jpe?g|png|webp)$/i);
  if (m) fileById.set(Number(m[1]), file);
}

const products = await db
  .select({
    id: productsTable.id,
    name: productsTable.name,
    images: productsTable.images,
    brand: brandsTable.name,
  })
  .from(productsTable)
  .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId));

const donors = new Map<string, { id: number; file: string }>();
for (const p of products) {
  const file = fileById.get(p.id);
  if (!file) continue;
  const key = modelKey(p.name, p.brand);
  if (!donors.has(key)) donors.set(key, { id: p.id, file });
}

let copied = 0;
const stillMissing: typeof products = [];

for (const p of products) {
  if (fileById.has(p.id) && p.images?.length) continue;
  if (fileById.has(p.id) && !p.images?.length) {
    const file = fileById.get(p.id)!;
    await db
      .update(productsTable)
      .set({ images: [`/products/${file}`] })
      .where(eq(productsTable.id, p.id));
    continue;
  }

  const key = modelKey(p.name, p.brand);
  const donor = donors.get(key);
  if (!donor) {
    stillMissing.push(p);
    continue;
  }

  const ext = path.extname(donor.file);
  const destName = `${p.id}${ext}`;
  const dest = path.join(PUBLIC_DIR, destName);
  await fs.copyFile(path.join(PUBLIC_DIR, donor.file), dest);
  await db
    .update(productsTable)
    .set({ images: [`/products/${destName}`] })
    .where(eq(productsTable.id, p.id));
  fileById.set(p.id, destName);
  copied += 1;
  console.log(`#${p.id} <- sibling #${donor.id} [${key}]`);
}

console.log(`\nCopied from siblings: ${copied}`);
console.log(`Still need search:   ${stillMissing.length}`);
for (const p of stillMissing) console.log(`  #${p.id} ${p.name}`);

await pool.end();
process.exit(stillMissing.length ? 2 : 0);
