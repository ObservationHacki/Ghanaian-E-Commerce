/**
 * Re-scrape product images with the JSON-LD-first pipeline.
 * Does not delete existing images until a new candidate passes AI + quality.
 *
 * Usage:
 *   pnpm catalog:rescrape-images
 *   pnpm catalog:rescrape-images -- --limit=5
 *   pnpm catalog:rescrape-images -- --id=66
 *   pnpm catalog:rescrape-images -- --allow-unverified
 *   pnpm catalog:rescrape-images -- --only-missing
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanupLegacyFlatFiles,
  scrapeProductImage,
} from "./images/pipeline";
import { visionConfigured } from "./images/vision";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const PUBLIC_DIR = path.join(REPO_ROOT, "artifacts/store/public/products");
const LOG_DIR = path.join(REPO_ROOT, "scripts/.cache/image-logs");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv: string[]) {
  let limit = Infinity;
  let id: number | null = null;
  let allowUnverified = false;
  let onlyMissing = false;
  let force = false;
  for (const arg of argv) {
    if (arg.startsWith("--limit=")) limit = Math.max(1, Number(arg.split("=")[1]) || 1);
    if (arg.startsWith("--id=")) id = Number(arg.split("=")[1]) || null;
    if (arg === "--allow-unverified") allowUnverified = true;
    if (arg === "--only-missing") onlyMissing = true;
    if (arg === "--force") force = true;
  }
  return { limit, id, allowUnverified, onlyMissing, force };
}

async function loadEnv() {
  try {
    process.loadEnvFile(path.join(REPO_ROOT, ".env"));
  } catch {
    // ignore
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await loadEnv();

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env at the repo root.");
    process.exit(1);
  }

  if (!visionConfigured() && !args.allowUnverified) {
    console.error(
      "No OPENAI_API_KEY or GEMINI_API_KEY found.\n" +
        "Set one in .env, or pass --allow-unverified to store without AI (not recommended).",
    );
    process.exit(1);
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(LOG_DIR, { recursive: true });

  const {
    db,
    pool,
    productsTable,
    productImagesTable,
    brandsTable,
  } = await import("@workspace/db");
  const { eq, and } = await import("drizzle-orm");

  let products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      images: productsTable.images,
      brand: brandsTable.name,
    })
    .from(productsTable)
    .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId))
    .orderBy(productsTable.id);

  if (args.id != null) {
    products = products.filter((p) => p.id === args.id);
  }

  if (args.onlyMissing) {
    products = products.filter((p) => !p.images?.length);
  } else if (!args.force && args.id == null) {
    // Default: skip products that already have a verified primary in product_images
    const verified = await db
      .select({
        productId: productImagesTable.productId,
      })
      .from(productImagesTable)
      .where(
        and(
          eq(productImagesTable.isPrimary, true),
          eq(productImagesTable.verified, true),
        ),
      );
    const done = new Set(verified.map((v) => v.productId));
    products = products.filter((p) => !done.has(p.id));
  }

  products = products.slice(0, args.limit === Infinity ? undefined : args.limit);

  console.log(
    `Re-scrape ${products.length} products` +
      (args.allowUnverified ? " (allow-unverified)" : "") +
      (visionConfigured() ? " with AI vision" : " without AI"),
  );

  let ok = 0;
  let fail = 0;

  for (const product of products) {
    const result = await scrapeProductImage(
      {
        id: product.id,
        name: product.name,
        brand: product.brand,
      },
      {
        publicRoot: PUBLIC_DIR,
        logDir: LOG_DIR,
        allowUnverified: args.allowUnverified,
        maxPages: 6,
        maxCandidates: 10,
      },
    );

    if (!result.ok) {
      fail += 1;
      await sleep(600);
      continue;
    }

    // Persist only after local files are written and verified.
    await db.transaction(async (tx) => {
      await tx
        .update(productImagesTable)
        .set({ isPrimary: false })
        .where(eq(productImagesTable.productId, product.id));

      await tx.insert(productImagesTable).values({
        productId: product.id,
        primaryImage: result.paths.largePath,
        thumbnail: result.paths.thumbnailPath,
        originalPath: result.paths.originalPath,
        largePath: result.paths.largePath,
        mediumPath: result.paths.mediumPath,
        width: result.width,
        height: result.height,
        mimeType: result.paths.mimeType,
        source: result.source,
        verified: result.verified,
        confidenceScore: String(result.confidence.toFixed(3)),
        qualityScore: result.qualityScore,
        isPrimary: true,
      });

      // Keep legacy images[] in sync for cart/list APIs.
      await tx
        .update(productsTable)
        .set({
          images: [
            result.paths.largePath,
            result.paths.mediumPath,
            result.paths.thumbnailPath,
          ],
        })
        .where(eq(productsTable.id, product.id));
    });

    await cleanupLegacyFlatFiles(PUBLIC_DIR, product.id);
    ok += 1;
    console.log(
      `  DB updated #${product.id} q=${result.qualityScore} conf=${result.confidence.toFixed(2)}`,
    );
    await sleep(800);
  }

  console.log(`\nDone. ok=${ok} fail=${fail} total=${products.length}`);
  console.log(`Logs: ${LOG_DIR}`);
  await pool.end();
  process.exit(fail && !ok ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
