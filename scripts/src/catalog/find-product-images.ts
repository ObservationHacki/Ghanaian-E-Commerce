/**
 * Find real product photos for catalog laptops, download locally, update DB.
 *
 * Sources (in order): DuckDuckGo images, Wikimedia Commons, Openverse.
 * Keeps looping over products that still lack a verified local image.
 *
 * Usage:
 *   pnpm catalog:find-images
 *   pnpm catalog:find-images -- --max-rounds=5
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const PUBLIC_DIR = path.join(REPO_ROOT, "artifacts/store/public/products");
const STATE_PATH = path.join(REPO_ROOT, "scripts/.cache/product-images-state.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const PREFERRED_HOSTS = [
  "asus.com",
  "dlcdn",
  "hp.com",
  "ssl-product-images",
  "dell.com",
  "lenovo.com",
  "p1-ofp.static",
  "www8.hp.com",
  "store.hp.com",
  "images.anandtech",
  "cdn.mos.cms.futurecdn.net",
  "laptopmedia.com",
  "static.techspot",
  "i.rtings.com",
  "m.media-amazon.com",
  "images-na.ssl-images-amazon",
  "wikimedia.org",
  "upload.wikimedia.org",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  let maxRounds = 8;
  for (const arg of argv) {
    if (arg.startsWith("--max-rounds=")) {
      maxRounds = Math.max(1, Number(arg.split("=")[1]) || 8);
    }
  }
  return { maxRounds };
}

/** Expand cryptic pricelist model codes into searchable product names. */
function buildSearchQueries(product) {
  const parts = product.name.split(/\s*·\s*/).map((p) => p.trim());
  const brand = product.brand || parts[0] || "";
  const model = parts[1] || "";
  const raw = `${brand} ${model}`.replace(/\s+/g, " ").trim();

  const queries = new Set();

  // Brand correction: OMEN / Pavilion gaming under ASUS labels in this catalog
  // are HP machines in the real world.
  let searchBrand = brand;
  let searchModel = model;
  if (/OMEN|Pavilion\s*[5-9]/i.test(model) && /asus/i.test(brand)) {
    searchBrand = "HP";
  }

  const map = [
    [/FX506/i, "ASUS TUF Gaming F15 FX506"],
    [/FX507/i, "ASUS TUF Gaming F15 FX507"],
    [/FX608|FA608|Tianxuan/i, "ASUS TUF Gaming F16"],
    [/FX95/i, "ASUS TUF Gaming FX95"],
    [/TUF-FX80|FX80/i, "ASUS TUF Gaming FX80"],
    [/TUF-FX63|FX63/i, "ASUS TUF Gaming FX63"],
    [/ROG Striker|Striker 9/i, "ASUS ROG Strix Scar 18"],
    [/Wuwei M1502/i, "ASUS Vivobook 15"],
    [/Wuwei M1607/i, "ASUS Vivobook 16"],
    [/Wuwei Pro14/i, "ASUS Vivobook Pro 14"],
    [/A-Dou|ADOL|M5406/i, "ASUS Zenbook 14 OLED"],
    [/PX563|PX463/i, "ASUS Vivobook 16"],
    [/X360-1040/i, "HP EliteBook x360 1040 G8"],
    [/X360-1030/i, "HP EliteBook x360 1030 G8"],
    [/X360-830/i, "HP EliteBook x360 830 G8"],
    [/ZBOOK15 G8|ZBook15 G8/i, "HP ZBook Fury 15 G8"],
    [/ZBOOK15 G7|ZBook15 G7/i, "HP ZBook Fury 15 G7"],
    [/840G10/i, "HP EliteBook 840 G10"],
    [/840G8/i, "HP EliteBook 840 G8"],
    [/840G7/i, "HP EliteBook 840 G7"],
    [/840G6/i, "HP EliteBook 840 G6"],
    [/840G5/i, "HP EliteBook 840 G5"],
    [/860G10/i, "HP EliteBook 860 G10"],
    [/850G8/i, "HP EliteBook 850 G8"],
    [/850G7/i, "HP EliteBook 850 G7"],
    [/850G3/i, "HP EliteBook 850 G3"],
    [/830G7/i, "HP EliteBook 830 G7"],
    [/830G6/i, "HP EliteBook 830 G6"],
    [/845G8/i, "HP EliteBook 845 G8"],
    [/745G6/i, "HP EliteBook 745 G6"],
    [/640G4|640G5/i, "HP ProBook 640 G5"],
    [/640G2/i, "HP ProBook 640 G2"],
    [/640G1/i, "HP ProBook 640 G1"],
    [/440-G10|440G10/i, "HP ProBook 440 G10"],
    [/440G7/i, "HP ProBook 440 G7"],
    [/430G7/i, "HP ProBook 430 G7"],
    [/430G5/i, "HP ProBook 430 G5"],
    [/430G3|430G4/i, "HP ProBook 430 G4"],
    [/240RG9/i, "HP 240 G9"],
    [/PAVILION 13/i, "HP Pavilion 13"],
    [/OMEN 9|Pavilion 9/i, "HP OMEN 16"],
    [/OMEN 8|Pavilion 8/i, "HP OMEN 16"],
    [/OMEN 7|Pavilion 7/i, "HP OMEN 15"],
    [/OMEN 6|Pavilion 6/i, "HP OMEN 15"],
    [/OMEN 5|Pavilion 5/i, "HP Pavilion Gaming 15"],
    [/X1C 2020|X1C/i, "Lenovo ThinkPad X1 Carbon"],
    [/\bX13\b/i, "Lenovo ThinkPad X13"],
    [/T14S/i, "Lenovo ThinkPad T14s"],
    [/\bT14\b/i, "Lenovo ThinkPad T14"],
    [/T490S/i, "Lenovo ThinkPad T490s"],
    [/T490/i, "Lenovo ThinkPad T490"],
    [/T480S|T480/i, "Lenovo ThinkPad T480"],
    [/T590/i, "Lenovo ThinkPad T590"],
    [/T580/i, "Lenovo ThinkPad T580"],
    [/T470/i, "Lenovo ThinkPad T470"],
    [/T460/i, "Lenovo ThinkPad T460"],
    [/T450/i, "Lenovo ThinkPad T450"],
    [/T440S/i, "Lenovo ThinkPad T440s"],
    [/E14|L14|R14/i, "Lenovo ThinkPad E14"],
    [/\bL13\b/i, "Lenovo ThinkPad L13"],
    [/L390/i, "Lenovo ThinkPad L390"],
    [/L480/i, "Lenovo ThinkPad L480"],
    [/7490/i, "Dell Latitude 7490"],
    [/7420/i, "Dell Latitude 7420"],
    [/7410/i, "Dell Latitude 7410"],
    [/7400/i, "Dell Latitude 7400"],
    [/5440/i, "Dell Latitude 5440"],
    [/5420/i, "Dell Latitude 5420"],
    [/5410/i, "Dell Latitude 5410"],
    [/5400/i, "Dell Latitude 5400"],
    [/3490|3400/i, "Dell Latitude 3490"],
    [/3420/i, "Dell Latitude 3420"],
  ];

  for (const [re, pretty] of map) {
    if (re.test(searchModel) || re.test(raw)) {
      queries.add(`${pretty} laptop`);
      queries.add(`${pretty} official`);
      break;
    }
  }

  queries.add(`${searchBrand} ${searchModel} laptop`);
  queries.add(`${searchBrand} ${searchModel} notebook product photo`);
  if (searchModel) queries.add(`${searchModel} laptop`);

  return [...queries];
}

function scoreCandidate(candidate, query) {
  let score = 0;
  const url = (candidate.image || candidate.url || "").toLowerCase();
  const title = (candidate.title || "").toLowerCase();
  const q = query.toLowerCase();

  for (const host of PREFERRED_HOSTS) {
    if (url.includes(host)) score += 25;
  }
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(url)) score += 10;
  if (/product|laptop|notebook|ultrabook/i.test(title + " " + url)) score += 8;
  if (/thumbnail|sprite|icon|logo|banner|svg/i.test(url)) score -= 40;
  if (/avatar|profile|face|person/i.test(url + title)) score -= 30;
  if (
    /keyboard|keycap|touchpad|palm.?rest|internals|motherboard|teardown|disassembl|how to open|webm|exploded/i.test(
      url + title,
    )
  )
    score -= 80;
  if (/laptop (open|closed)|notebook pc|product (image|photo)|official/i.test(title))
    score += 10;

  const tokens = q
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["laptop", "notebook", "official", "photo", "product"].includes(t));
  for (const token of tokens) {
    if (title.includes(token.toLowerCase()) || url.includes(token.toLowerCase())) score += 4;
  }

  const w = candidate.width || 0;
  const h = candidate.height || 0;
  if (w >= 600 && h >= 400) score += 12;
  else if (w >= 400) score += 6;
  if (w && h && w / h > 2.5) score -= 10; // likely banner
  // Prefer mid-size assets over multi-megabyte PNGs.
  if (w >= 900 && w <= 1800) score += 4;
  if (w > 2500) score -= 6;

  return score;
}

async function writeState(state: unknown) {
  const tmp = STATE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, STATE_PATH);
}

async function getDdgVqd(query) {
  const res = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
    { headers: { "User-Agent": UA, Accept: "text/html" } },
  );
  const html = await res.text();
  const patterns = [
    /vqd=["']([^"']+)["']/,
    /vqd=([^&]+)&/,
    /"vqd":"([^"]+)"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeURIComponent(m[1]);
  }
  return null;
}

async function searchDuckDuckGo(query) {
  const vqd = await getDdgVqd(query);
  if (!vqd) return [];
  await sleep(400);
  const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,&p=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Referer: "https://duckduckgo.com/",
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r) => ({
    image: r.image,
    url: r.url,
    title: r.title,
    width: r.width,
    height: r.height,
    source: "duckduckgo",
  }));
}

async function searchWikimedia(query) {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
    encodeURIComponent(query) +
    "&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1200&format=json&origin=*";
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  return pages
    .map((p) => {
      const info = p.imageinfo?.[0];
      if (!info) return null;
      return {
        image: info.thumburl || info.url,
        url: info.descriptionurl || info.url,
        title: p.title,
        width: info.thumbwidth || info.width,
        height: info.thumbheight || info.height,
        source: "wikimedia",
      };
    })
    .filter(Boolean);
}

async function searchOpenverse(query) {
  const url =
    "https://api.openverse.org/v1/images/?page_size=8&q=" +
    encodeURIComponent(query);
  const res = await fetch(url, {
    headers: { "User-Agent": "KumasiStore/1.0 (catalog image enrichment)" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r) => ({
    image: r.url,
    url: r.foreign_landing_url || r.url,
    title: r.title,
    width: r.width,
    height: r.height,
    source: "openverse",
  }));
}

async function gatherCandidates(queries) {
  const all = [];
  for (const query of queries.slice(0, 3)) {
    try {
      const ddg = await searchDuckDuckGo(query);
      all.push(...ddg.map((c) => ({ ...c, query, score: scoreCandidate(c, query) })));
    } catch {
      // continue
    }
    await sleep(500);
    try {
      const wiki = await searchWikimedia(query);
      all.push(...wiki.map((c) => ({ ...c, query, score: scoreCandidate(c, query) })));
    } catch {
      // continue
    }
    try {
      const ov = await searchOpenverse(query);
      all.push(...ov.map((c) => ({ ...c, query, score: scoreCandidate(c, query) })));
    } catch {
      // continue
    }
    await sleep(300);
  }

  // Dedupe by image URL
  const seen = new Set();
  return all
    .filter((c) => {
      const key = c.image;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

async function downloadImage(imageUrl, destBase) {
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": UA, Accept: "image/*,*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get("content-type") || "").toLowerCase();
  if (!type.startsWith("image/")) throw new Error(`Not image: ${type}`);
  if (type.includes("svg")) throw new Error("SVG skipped");

  let ext = ".jpg";
  if (type.includes("png")) ext = ".png";
  else if (type.includes("webp")) ext = ".webp";
  else if (type.includes("jpeg") || type.includes("jpg")) ext = ".jpg";

  const dest = destBase + ext;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8_000) throw new Error(`Too small: ${buf.length}`);
  // Keep storefront assets lean — disk was getting tight on the host.
  if (buf.length > 1_500_000) throw new Error(`Too large: ${buf.length}`);

  // Magic-byte sanity
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isWebp = buf.toString("ascii", 0, 4) === "RIFF";
  if (!isJpeg && !isPng && !isWebp) throw new Error("Unknown image magic");

  await fs.writeFile(dest, buf);
  return { dest, ext, bytes: buf.length };
}

async function loadEnv() {
  try {
    process.loadEnvFile(path.join(REPO_ROOT, ".env"));
  } catch {
    // ignore
  }
}

async function loadProducts(db, productsTable, brandsTable, eq) {
  return db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      images: productsTable.images,
      brand: brandsTable.name,
    })
    .from(productsTable)
    .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId));
}

async function main() {
  const { maxRounds } = parseArgs(process.argv.slice(2));
  await loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });

  const { db, pool, productsTable, brandsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");

  let state: {
    attempts: Record<string, string[]>;
    assigned: Record<string, unknown>;
  } = { attempts: {}, assigned: {} };
  try {
    state = JSON.parse(await fs.readFile(STATE_PATH, "utf8"));
  } catch {
    // Rebuild assigned map from files already on disk.
    try {
      const files = await fs.readdir(PUBLIC_DIR);
      for (const file of files) {
        const m = file.match(/^(\d+)\.(jpe?g|png|webp)$/i);
        if (!m) continue;
        state.assigned[m[1]] = { path: `/products/${file}`, recovered: true };
      }
      console.log(`Recovered ${Object.keys(state.assigned).length} assignments from disk.`);
    } catch {
      // fresh
    }
  }

  for (let round = 1; round <= maxRounds; round++) {
    const products = await loadProducts(db, productsTable, brandsTable, eq);
    const pending = products.filter((p) => !p.images?.length);
    console.log(`\n=== Round ${round}/${maxRounds} — ${pending.length} products still need images ===`);
    if (!pending.length) {
      console.log("All products have images.");
      break;
    }

    let assignedThisRound = 0;

    for (const product of pending) {
      const tried = new Set(state.attempts[String(product.id)] || []);
      const queries = buildSearchQueries(product);
      console.log(`\n#${product.id} ${product.name}`);
      console.log(`  queries: ${queries.slice(0, 2).join(" | ")}`);

      const candidates = await gatherCandidates(queries);
      const usable = candidates.filter(
        (c) => c.score >= 8 && c.image && !tried.has(c.image),
      );
      console.log(`  candidates: ${candidates.length} (usable ${usable.length})`);

      let ok = false;
      for (const candidate of usable.slice(0, 12)) {
        tried.add(candidate.image);
        try {
          const base = path.join(PUBLIC_DIR, String(product.id));
          // remove old extensions
          for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
            await fs.unlink(base + ext).catch(() => {});
          }
          const { dest, ext, bytes } = await downloadImage(candidate.image, base);
          const publicPath = `/products/${product.id}${ext}`;
          await db
            .update(productsTable)
            .set({ images: [publicPath] })
            .where(eq(productsTable.id, product.id));
          state.assigned[String(product.id)] = {
            path: publicPath,
            sourceUrl: candidate.image,
            source: candidate.source,
            query: candidate.query,
            score: candidate.score,
            bytes,
            title: candidate.title,
          };
          console.log(
            `  OK <- ${candidate.source} score=${candidate.score} ${bytes}B ${publicPath}`,
          );
          console.log(`     ${candidate.title || ""}`.slice(0, 100));
          assignedThisRound += 1;
          ok = true;
          break;
        } catch (err) {
          console.log(`  skip (${candidate.source}): ${err.message}`);
        }
        await sleep(200);
      }

      state.attempts[String(product.id)] = [...tried].slice(-25);
      if (!ok) console.log("  FAILED this round");
      await writeState(state);
      await sleep(700);
    }

    console.log(`\nRound ${round} assigned ${assignedThisRound}`);
    if (assignedThisRound === 0) {
      console.log("No progress this round — stopping.");
      break;
    }
  }

  const finalProducts = await loadProducts(db, productsTable, brandsTable, eq);
  const missing = finalProducts.filter((p) => !p.images?.length);
  console.log(`\nDone. With images: ${finalProducts.length - missing.length}/${finalProducts.length}`);
  if (missing.length) {
    console.log("Still missing:");
    for (const p of missing) console.log(`  #${p.id} ${p.name}`);
  }

  await pool.end();
  process.exit(missing.length ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
