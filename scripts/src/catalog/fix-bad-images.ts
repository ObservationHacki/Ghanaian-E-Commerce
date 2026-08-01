/**
 * Re-fetch exterior product photos for specific IDs with strict title matching.
 *
 * Usage: tsx ./src/catalog/fix-bad-images.ts 64 66 95 98
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PUBLIC_DIR = path.join(REPO_ROOT, "artifacts/store/public/products");

type Target = {
  id: number;
  query: string;
  /** All of these must appear in the result title (case-insensitive). */
  must: string[];
  /** Reject if any of these appear. */
  reject?: RegExp;
  siblingName?: RegExp;
};

const CATALOG: Target[] = [
  {
    id: 64,
    query: "Lenovo ThinkPad T14s laptop official product photo",
    must: ["thinkpad", "t14s"],
    reject: /disassembl|teardown|internal|keyboard|motherboard|opened|how to open|webm/i,
    siblingName: /T14S/i,
  },
  {
    id: 66,
    query: "Dell Latitude 5400 laptop official product photo",
    must: ["latitude", "5400"],
    reject: /keyboard|xps|inspiron|teardown|internal|opened/i,
    siblingName: /Dell · 5400/i,
  },
  {
    id: 95,
    query: "ASUS ROG Strix Scar 18 laptop official",
    must: ["rog", "strix"],
    reject: /keyboard only|teardown|internal|motherboard/i,
  },
  {
    id: 98,
    query: "ASUS ROG Strix Scar 18 laptop official product",
    must: ["rog", "strix"],
    reject: /keyboard only|teardown|internal|motherboard/i,
  },
];

async function search(query: string) {
  const html = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
    { headers: { "User-Agent": UA } },
  ).then((r) => r.text());
  const m = html.match(/vqd=["']([^"']+)["']/) || html.match(/vqd=([^&\s]+)/);
  if (!m?.[1]) throw new Error(`no vqd for ${query}`);
  await new Promise((r) => setTimeout(r, 400));
  const data = await fetch(
    `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(m[1])}&f=,,,,&p=1`,
    { headers: { "User-Agent": UA, Referer: "https://duckduckgo.com/" } },
  ).then((r) => r.json());
  return (data.results || []) as Array<{
    title: string;
    image: string;
    width: number;
    height: number;
  }>;
}

async function download(url: string): Promise<{ buf: Buffer; ext: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") || "").toLowerCase();
  if (!type.startsWith("image/") || type.includes("svg")) {
    throw new Error(`bad type ${type}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 12_000) throw new Error(`too small ${buf.length}`);
  if (buf.length > 1_800_000) throw new Error(`too large ${buf.length}`);
  let ext = ".jpg";
  if (type.includes("png") || url.includes(".png")) ext = ".png";
  else if (type.includes("webp")) ext = ".jpg"; // force re-save name as jpg container if webp bytes — skip webp
  if (type.includes("webp")) throw new Error("skip webp");
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isJpeg && !isPng) throw new Error("bad magic");
  if (isPng) ext = ".png";
  if (isJpeg) ext = ".jpg";
  return { buf, ext };
}

async function clearId(id: number) {
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    await fs.unlink(path.join(PUBLIC_DIR, `${id}${ext}`)).catch(() => {});
  }
}

async function main() {
  const want = new Set(
    process.argv.slice(2).map(Number).filter((n) => n > 0),
  );
  const targets = CATALOG.filter((t) => !want.size || want.has(t.id));
  if (!targets.length) {
    console.error("No matching targets");
    process.exit(1);
  }

  try {
    process.loadEnvFile(path.join(REPO_ROOT, ".env"));
  } catch {
    // ignore
  }
  const { db, pool, productsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");

  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      images: productsTable.images,
    })
    .from(productsTable);

  for (const target of targets) {
    console.log(`\n=== #${target.id} ${target.query} ===`);
    await clearId(target.id);
    await db
      .update(productsTable)
      .set({ images: [] })
      .where(eq(productsTable.id, target.id));

    const results = await search(target.query);
    const reject = target.reject || /disassembl|teardown|internal|keyboard|motherboard/i;
    const candidates = results.filter((r) => {
      const title = r.title || "";
      const hay = `${title} ${r.image}`.toLowerCase();
      if (reject.test(hay)) return false;
      return target.must.every((tok) => hay.includes(tok.toLowerCase()));
    });
    console.log(`candidates ${candidates.length}/${results.length}`);

    let saved: { path: string; buf: Buffer } | null = null;
    for (const c of candidates.slice(0, 15)) {
      try {
        const { buf, ext } = await download(c.image);
        const destName = `${target.id}${ext}`;
        await fs.writeFile(path.join(PUBLIC_DIR, destName), buf);
        const publicPath = `/products/${destName}`;
        await db
          .update(productsTable)
          .set({ images: [publicPath] })
          .where(eq(productsTable.id, target.id));
        console.log(`OK ${publicPath} ${buf.length}B — ${c.title}`);
        saved = { path: publicPath, buf };
        break;
      } catch (err) {
        console.log(`skip: ${(err as Error).message}`);
      }
    }
    if (!saved) {
      console.log("FAILED");
      continue;
    }

    if (target.siblingName) {
      for (const p of products) {
        if (p.id === target.id) continue;
        if (!target.siblingName.test(p.name)) continue;
        const ext = path.extname(saved.path);
        const destName = `${p.id}${ext}`;
        await clearId(p.id);
        await fs.writeFile(path.join(PUBLIC_DIR, destName), saved.buf);
        await db
          .update(productsTable)
          .set({ images: [`/products/${destName}`] })
          .where(eq(productsTable.id, p.id));
        console.log(`  sibling #${p.id} <- ${destName}`);
      }
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
