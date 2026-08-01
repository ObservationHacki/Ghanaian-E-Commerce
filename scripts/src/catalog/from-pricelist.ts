import { existsSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import {
  INVOCATION_DIR,
  PRODUCTS_SHEET,
  PRODUCT_HEADERS,
  REPO_ROOT,
  VARIANTS_SHEET,
  VARIANT_HEADERS,
  resolveUserPath,
  slugify,
} from "./workbook";

type SpecRow = {
  sheet: string;
  category: string;
  brand: string;
  model: string;
  screen: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  color: string;
  priceGhs: number;
  series: string;
};

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).replace(/\s+/g, " ").trim();
  }
  if (typeof value === "object") {
    if ("text" in value) return cellText((value as { text: unknown }).text);
    if ("result" in value) {
      return cellText((value as { result: unknown }).result);
    }
    if ("richText" in value) {
      return (value as { richText: Array<{ text: string }> }).richText
        .map((part) => part.text)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/gh[₵¢cs]?/gi, "ghs")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDash(value: string): boolean {
  return value === "" || value === "-" || value === "—";
}

function cleanSpec(value: string): string {
  return isDash(value) ? "" : value;
}

function parsePrice(raw: string): number | null {
  if (isDash(raw)) return null;
  const cleaned = raw.replace(/[,\s]/g, "").replace(/^(GHS|GH₵|₵)/i, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

function titleCaseBrand(value: string): string {
  const known: Record<string, string> = {
    hp: "HP",
    asus: "ASUS",
    dell: "Dell",
    lenovo: "Lenovo",
    apple: "Apple",
    samsung: "Samsung",
    msi: "MSI",
    acer: "Acer",
  };

  const lower = value.toLowerCase();
  return known[lower] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

function inferBrand(seriesOrBrand: string, sheetName: string): string {
  const value = seriesOrBrand.trim();
  const sheet = sheetName.toLowerCase();

  // The ASUS Tianchuan sheet uses Chinese series names (Tianxuan, LingYao,
  // ADOL, Poxiao, Wuwei, ROG). Those are product lines, not brands.
  if (sheet.includes("asus")) return "ASUS";

  if (!value) return "Generic";

  const first = value.split(/\s+/)[0]!;
  return titleCaseBrand(first);
}

function buildName(row: SpecRow): string {
  const parts = [
    row.brand,
    row.model,
    row.cpu,
    row.ram,
    row.storage,
    row.gpu,
    row.color,
  ].filter((part) => part !== "");

  return parts.join(" · ");
}

function buildDescription(row: SpecRow): string {
  // Keep a structured seed description so enrich-descriptions.ts (and future
  // re-imports) can parse CPU/RAM/storage/GPU/display reliably.
  const lines = [
    `${row.brand} ${row.model}`.trim(),
    row.series && row.series !== row.brand ? `Series: ${row.series}` : "",
    row.cpu ? `CPU: ${row.cpu}` : "",
    row.ram ? `RAM: ${row.ram}` : "",
    row.storage ? `Storage: ${row.storage}` : "",
    row.gpu ? `GPU: ${row.gpu}` : "",
    row.screen ? `Display: ${row.screen}` : "",
    row.color ? `Color: ${row.color}` : "",
  ].filter((line) => line !== "");

  return lines.join(". ") + ".";
}

function buildCode(row: SpecRow, index: number): string {
  const base = slugify(
    [
      row.brand,
      row.model,
      row.cpu,
      row.ram,
      row.storage,
      row.gpu,
      row.color,
      row.screen,
    ]
      .filter(Boolean)
      .join(" "),
  ).slice(0, 48);

  return `LAP-${String(index).padStart(3, "0")}-${base || "item"}`.toUpperCase();
}

function mapHeaders(sheet: ExcelJS.Worksheet, headerRow: number): Map<string, number> {
  const map = new Map<string, number>();
  const row = sheet.getRow(headerRow);

  row.eachCell((cell, column) => {
    const header = normalizeHeader(cellText(cell.value));
    if (!header) return;

    if (header === "#" || header === "no" || header === "no.") map.set("#", column);
    else if (header.includes("series") && header.includes("brand")) map.set("series", column);
    else if (header === "brand") map.set("brand", column);
    else if (header === "model") map.set("model", column);
    else if (header === "cpu") map.set("cpu", column);
    else if (header === "ram") map.set("ram", column);
    else if (header === "storage" || header === "ssd") map.set("storage", column);
    else if (header === "gpu") map.set("gpu", column);
    else if (header.includes("screen") || header.includes("resolution")) map.set("screen", column);
    else if (header === "color" || header === "colour") map.set("color", column);
    else if (header.includes("price") && header.includes("ghs")) map.set("price_ghs", column);
    else if (header.includes("price") && header.includes("us")) map.set("price_usd", column);
    else if (header === "price") map.set("price_ghs", column);
  });

  return map;
}

function looksLikeHeader(row: ExcelJS.Row): boolean {
  const values: string[] = [];
  row.eachCell((cell) => values.push(normalizeHeader(cellText(cell.value))));
  return values.includes("model") && (values.includes("cpu") || values.includes("brand"));
}

function extractRows(
  sheet: ExcelJS.Worksheet,
  category: string,
): SpecRow[] {
  const rows: SpecRow[] = [];
  let headers: Map<string, number> | null = null;

  sheet.eachRow((row, rowNumber) => {
    if (looksLikeHeader(row)) {
      headers = mapHeaders(sheet, rowNumber);
      return;
    }

    if (!headers) return;

    const first = cellText(row.getCell(headers.get("#") ?? 1).value);
    if (!/^\d+$/.test(first)) return;

    const get = (key: string) => {
      const column = headers!.get(key);
      return column ? cleanSpec(cellText(row.getCell(column).value)) : "";
    };

    const seriesOrBrand = get("series") || get("brand");
    const model = get("model");
    const priceGhs = parsePrice(get("price_ghs"));

    if (!model || priceGhs === null) return;

    const brand = inferBrand(seriesOrBrand, sheet.name);

    rows.push({
      sheet: sheet.name,
      category,
      brand,
      model,
      screen: get("screen"),
      cpu: get("cpu"),
      ram: get("ram"),
      storage: get("storage"),
      gpu: get("gpu"),
      color: get("color"),
      priceGhs,
      series: seriesOrBrand,
    });
  });

  return rows;
}

function parseArgs(argv: string[]): { input: string; output: string } {
  let input = "laptop_pricelist_GHS.xlsx";
  let output = "catalog-laptops.xlsx";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--file" || arg === "--input") {
      input = argv[++i] ?? input;
    } else if (arg.startsWith("--file=") || arg.startsWith("--input=")) {
      input = arg.split("=")[1] ?? input;
    } else if (arg === "--out" || arg === "--output") {
      output = argv[++i] ?? output;
    } else if (arg.startsWith("--out=") || arg.startsWith("--output=")) {
      output = arg.split("=")[1] ?? output;
    } else if (!arg.startsWith("--")) {
      input = arg;
    }
  }

  return { input, output };
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));
  const inputPath = resolveUserPath(input, existsSync);

  if (!existsSync(inputPath)) {
    console.error(`No such file: ${inputPath}`);
    process.exit(1);
  }

  const source = new ExcelJS.Workbook();
  await source.xlsx.readFile(inputPath);

  const specs: SpecRow[] = [];

  for (const sheet of source.worksheets) {
    const name = sheet.name.toLowerCase();
    const category = name.includes("gaming")
      ? "Gaming Laptops"
      : "Laptops";
    specs.push(...extractRows(sheet, category));
  }

  if (specs.length === 0) {
    console.error("No product rows found in the pricelist.");
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VBUY pricelist converter";
  const products = workbook.addWorksheet(PRODUCTS_SHEET);
  const variants = workbook.addWorksheet(VARIANTS_SHEET);

  products.columns = PRODUCT_HEADERS.map((header) => ({
    header,
    key: header,
    width: 24,
  }));
  variants.columns = VARIANT_HEADERS.map((header) => ({
    header,
    key: header,
    width: 20,
  }));
  products.getRow(1).font = { bold: true };
  variants.getRow(1).font = { bold: true };

  const featuredIndexes = new Set(
    [0, 1, 2, Math.floor(specs.length / 3), Math.floor((specs.length * 2) / 3)]
      .filter((index) => index >= 0 && index < specs.length),
  );

  specs.forEach((row, index) => {
    const productCode = buildCode(row, index + 1);
    products.addRow({
      product_code: productCode,
      name: buildName(row),
      description: buildDescription(row),
      category: row.category,
      brand: row.brand,
      base_price: row.priceGhs.toFixed(2),
      stock: 8,
      images: "",
      featured: featuredIndexes.has(index) ? "yes" : "no",
    });
  });

  const outputPath = path.resolve(INVOCATION_DIR, output);
  await workbook.xlsx.writeFile(outputPath);

  const brands = [...new Set(specs.map((row) => row.brand))];
  const categories = [...new Set(specs.map((row) => row.category))];

  console.log(`Wrote ${path.relative(REPO_ROOT, outputPath)}`);
  console.log(`  products    ${specs.length}`);
  console.log(`  categories  ${categories.join(", ")}`);
  console.log(`  brands      ${brands.join(", ")}`);
  console.log("");
  console.log("Next:");
  console.log(`  pnpm run catalog:import --file ${path.basename(outputPath)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
