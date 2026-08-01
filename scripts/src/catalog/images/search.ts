import type { ProductRef } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MANUFACTURER_HOSTS = [
  "asus.com",
  "hp.com",
  "dell.com",
  "lenovo.com",
  "rog.asus.com",
];

export function buildSearchQuery(product: ProductRef): string {
  const parts = product.name.split(/\s*·\s*/).map((p) => p.trim());
  let brand = product.brand || parts[0] || "";
  let model = parts[1] || "";

  if (/OMEN|Pavilion\s*[5-9]/i.test(model) && /asus/i.test(brand)) {
    brand = "HP";
  }

  // Expand common pricelist codes into searchable names.
  const expansions: Array<[RegExp, string]> = [
    [/FX506/i, "ASUS TUF Gaming F15 FX506"],
    [/FX507/i, "ASUS TUF Gaming F15 FX507"],
    [/FX608|FA608|Tianxuan/i, "ASUS TUF Gaming F16"],
    [/ROG Striker|Striker 9/i, "ASUS ROG Strix Scar 18"],
    [/X360-1040/i, "HP EliteBook x360 1040"],
    [/X360-1030/i, "HP EliteBook x360 1030"],
    [/X360-830/i, "HP EliteBook x360 830"],
    [/840G/i, "HP EliteBook 840"],
    [/ZBOOK/i, "HP ZBook"],
    [/X1C/i, "Lenovo ThinkPad X1 Carbon"],
    [/T14S/i, "Lenovo ThinkPad T14s"],
    [/T480/i, "Lenovo ThinkPad T480"],
    [/7490/i, "Dell Latitude 7490"],
    [/5400/i, "Dell Latitude 5400"],
    [/7400/i, "Dell Latitude 7400"],
  ];

  for (const [re, pretty] of expansions) {
    if (re.test(model) || re.test(product.name)) {
      return `${pretty} laptop official`;
    }
  }

  return `${brand} ${model} laptop official site`.replace(/\s+/g, " ").trim();
}

async function ddgVqd(query: string): Promise<string | null> {
  const html = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    { headers: { "User-Agent": UA } },
  ).then((r) => r.text());
  return (
    html.match(/vqd=["']([^"']+)["']/)?.[1] ||
    html.match(/vqd=([^&\s]+)/)?.[1] ||
    null
  );
}

/** Return ranked product-page URLs from DuckDuckGo HTML results. */
export async function searchProductPages(
  product: ProductRef,
  limit = 8,
): Promise<string[]> {
  const query = buildSearchQuery(product);
  const html = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
      },
    },
  ).then((r) => r.text());

  const urls: string[] = [];
  const re = /uddg=([^&"]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const url = decodeURIComponent(m[1]);
      if (!/^https?:\/\//i.test(url)) continue;
      if (urls.includes(url)) continue;
      urls.push(url);
    } catch {
      // ignore
    }
  }

  // Also try classic result anchors.
  const aRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"/gi;
  while ((m = aRe.exec(html))) {
    let href = m[1];
    if (href.includes("uddg=")) {
      const u = href.match(/uddg=([^&]+)/)?.[1];
      if (u) href = decodeURIComponent(u);
    }
    if (!/^https?:\/\//i.test(href)) continue;
    if (!urls.includes(href)) urls.push(href);
  }

  const scored = urls.map((url) => {
    let s = 0;
    const host = url.toLowerCase();
    for (const h of MANUFACTURER_HOSTS) {
      if (host.includes(h)) s += 50;
    }
    if (/product|laptop|notebook|pdp|\/dp\//i.test(host)) s += 10;
    if (/amazon\.|ebay\.|facebook\.|youtube\.|pinterest\./i.test(host)) s -= 20;
    return { url, s };
  });

  scored.sort((a, b) => b.s - a.s);
  void ddgVqd; // reserved for future i.js usage
  return scored.slice(0, limit).map((x) => x.url);
}

export async function fetchPageHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html") && !type.includes("text")) return null;
    return await res.text();
  } catch {
    return null;
  }
}
