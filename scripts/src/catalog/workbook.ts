import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CellValue, Worksheet } from "exceljs";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

// pnpm runs package scripts from the package directory, but people type paths
// relative to wherever they ran the command. INIT_CWD is where they were.
export const INVOCATION_DIR = process.env.INIT_CWD ?? process.cwd();

/**
 * Resolve a user-supplied path against the directory the command was run from,
 * falling back to the repo root so the defaults work from anywhere.
 */
export function resolveUserPath(
  input: string,
  exists: (candidate: string) => boolean,
): string {
  const fromInvocation = path.resolve(INVOCATION_DIR, input);
  if (exists(fromInvocation)) return fromInvocation;

  const fromRepoRoot = path.resolve(REPO_ROOT, input);
  if (exists(fromRepoRoot)) return fromRepoRoot;

  return fromInvocation;
}

export const PRODUCTS_SHEET = "Products";
export const VARIANTS_SHEET = "Variants";

export const PRODUCT_HEADERS = [
  "product_code",
  "name",
  "description",
  "category",
  "brand",
  "base_price",
  "stock",
  "images",
  "featured",
] as const;

export const VARIANT_HEADERS = [
  "product_code",
  "name",
  "sku",
  "price",
  "stock",
  "attributes",
] as const;

export const REQUIRED_PRODUCT_HEADERS = [
  "product_code",
  "name",
  "description",
  "base_price",
] as const;

export const REQUIRED_VARIANT_HEADERS = [
  "product_code",
  "name",
  "sku",
  "price",
] as const;

export const COLUMN_NOTES: Record<string, string> = {
  "Products.product_code":
    "Required, unique. Your own code for the product. Re-importing matches on this, so keep it stable even if the name changes. Also used as the SKU when the product has no rows in the Variants sheet.",
  "Products.name": "Required. Shown on cards, listings and the product page.",
  "Products.description": "Required. Shown on the product page.",
  "Products.category":
    "Category name such as Electronics. Created automatically the first time it appears. Leave blank for none.",
  "Products.brand":
    "Brand name such as Samsung. Created automatically the first time it appears. Leave blank for none.",
  "Products.base_price":
    "Required. Price in GHS, numbers only, up to 2 decimals. Example: 1899.00",
  "Products.stock":
    "Whole number, defaults to 0. Only used when the product has no rows in the Variants sheet. A product with 0 stock everywhere shows as out of stock.",
  "Products.images":
    "Image URLs separated by commas or new lines. The first one is used as the card image.",
  "Products.featured":
    "yes or no. Featured products appear in the Featured section on the homepage.",
  "Variants.product_code":
    "Required. Must match a product_code in the Products sheet.",
  "Variants.name": "Required. Example: 256GB / Midnight",
  "Variants.sku": "Required, unique across the whole workbook.",
  "Variants.price": "Required. Price in GHS for this specific variant.",
  "Variants.stock": "Whole number, defaults to 0.",
  "Variants.attributes":
    "Optional. Pairs like colour=Midnight; storage=256GB, separated by semicolons.",
};

export type Issue = { ref: string; message: string };

export function columnLetter(index: number): string {
  let remaining = index;
  let letters = "";

  while (remaining > 0) {
    const offset = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + offset) + letters;
    remaining = Math.floor((remaining - 1) / 26);
  }

  return letters || "A";
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Excel cells arrive as plain values, rich text runs, hyperlinks, formula
// results or error objects depending on how the sheet was authored.
export function cellText(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((run) => run.text).join("").trim();
    }
    if ("result" in value) return cellText(value.result as CellValue);
    if ("text" in value) return String(value.text).trim();
    if ("error" in value) return "";
  }

  return String(value).trim();
}

export class SheetReader {
  private readonly headerColumns = new Map<string, number>();

  readonly issues: Issue[] = [];

  constructor(
    private readonly sheetName: string,
    private readonly worksheet: Worksheet,
    knownHeaders: readonly string[],
    requiredHeaders: readonly string[],
  ) {
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell, columnNumber) => {
      const header = cellText(cell.value).toLowerCase();
      if (header) this.headerColumns.set(header, columnNumber);
    });

    for (const header of requiredHeaders) {
      if (!this.headerColumns.has(header)) {
        this.issues.push({
          ref: `${sheetName}!1`,
          message: `missing required column "${header}"`,
        });
      }
    }

    for (const header of this.headerColumns.keys()) {
      if (!knownHeaders.includes(header)) {
        this.issues.push({
          ref: `${sheetName}!1`,
          message: `unrecognised column "${header}" — it will be ignored`,
        });
      }
    }
  }

  get dataRowNumbers(): number[] {
    const numbers: number[] = [];

    this.worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const hasContent = Array.isArray(row.values)
        ? row.values.some((value) => cellText(value as CellValue) !== "")
        : false;

      if (hasContent) numbers.push(rowNumber);
    });

    return numbers;
  }

  ref(header: string, rowNumber: number): string {
    const column = this.headerColumns.get(header);
    if (!column) return `${this.sheetName}!${rowNumber}`;
    return `${this.sheetName}!${columnLetter(column)}${rowNumber}`;
  }

  value(header: string, rowNumber: number): string {
    const column = this.headerColumns.get(header);
    if (!column) return "";
    return cellText(this.worksheet.getRow(rowNumber).getCell(column).value);
  }
}

export type FieldContext = {
  ref: string;
  issues: Issue[];
};

export function requireText(
  raw: string,
  header: string,
  context: FieldContext,
): string {
  if (raw === "") {
    context.issues.push({
      ref: context.ref,
      message: `${header} is required`,
    });
  }
  return raw;
}

export function parsePrice(
  raw: string,
  header: string,
  context: FieldContext,
): string {
  if (raw === "") {
    context.issues.push({ ref: context.ref, message: `${header} is required` });
    return "0";
  }

  const cleaned = raw.replace(/[,\s]/g, "").replace(/^(GHS|GH₵|₵)/i, "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    context.issues.push({
      ref: context.ref,
      message: `${header} "${raw}" is not a number`,
    });
    return "0";
  }

  if (parsed < 0) {
    context.issues.push({
      ref: context.ref,
      message: `${header} cannot be negative`,
    });
    return "0";
  }

  if (parsed > 99_999_999.99) {
    context.issues.push({
      ref: context.ref,
      message: `${header} is too large for the database column (max 99,999,999.99)`,
    });
    return "0";
  }

  return parsed.toFixed(2);
}

export function parseStock(
  raw: string,
  header: string,
  context: FieldContext,
): number {
  if (raw === "") return 0;

  const parsed = Number(raw.replace(/[,\s]/g, ""));

  if (!Number.isInteger(parsed) || parsed < 0) {
    context.issues.push({
      ref: context.ref,
      message: `${header} "${raw}" must be a whole number of 0 or more`,
    });
    return 0;
  }

  return parsed;
}

const TRUTHY = new Set(["yes", "y", "true", "1"]);
const FALSY = new Set(["", "no", "n", "false", "0"]);

export function parseFlag(
  raw: string,
  header: string,
  context: FieldContext,
): boolean {
  const normalized = raw.toLowerCase();

  if (TRUTHY.has(normalized)) return true;
  if (FALSY.has(normalized)) return false;

  context.issues.push({
    ref: context.ref,
    message: `${header} "${raw}" must be yes or no`,
  });
  return false;
}

export function parseImages(raw: string, context: FieldContext): string[] {
  if (raw === "") return [];

  const urls = raw
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

  for (const url of urls) {
    if (!/^(https?:\/\/|\/)/i.test(url)) {
      context.issues.push({
        ref: context.ref,
        message: `image "${url}" must start with http://, https:// or /`,
      });
    }
  }

  return urls;
}

export function parseAttributes(
  raw: string,
  context: FieldContext,
): Record<string, string> {
  if (raw === "") return {};

  const attributes: Record<string, string> = {};

  for (const pair of raw.split(";")) {
    const trimmed = pair.trim();
    if (trimmed === "") continue;

    const separator = trimmed.indexOf("=");

    if (separator <= 0) {
      context.issues.push({
        ref: context.ref,
        message: `attribute "${trimmed}" must look like key=value`,
      });
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();

    if (key === "") {
      context.issues.push({
        ref: context.ref,
        message: `attribute "${trimmed}" is missing a key`,
      });
      continue;
    }

    attributes[key] = value;
  }

  return attributes;
}
