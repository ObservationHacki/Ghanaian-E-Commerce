import path from "node:path";
import ExcelJS from "exceljs";
import {
  COLUMN_NOTES,
  INVOCATION_DIR,
  PRODUCTS_SHEET,
  PRODUCT_HEADERS,
  VARIANTS_SHEET,
  VARIANT_HEADERS,
} from "./workbook";

const COLUMN_WIDTHS: Record<string, number> = {
  product_code: 16,
  name: 32,
  description: 52,
  category: 18,
  brand: 16,
  base_price: 12,
  price: 12,
  stock: 8,
  images: 46,
  featured: 10,
  sku: 20,
  attributes: 32,
};

const EXAMPLE_PRODUCTS = [
  {
    product_code: "TV-SAMS-55Q60",
    name: 'Samsung 55" QLED 4K Smart TV',
    description:
      "Quantum Dot colour, 4K upscaling and built-in streaming apps. Includes wall bracket and two-year Ghana warranty.",
    category: "Electronics",
    brand: "Samsung",
    base_price: 8499,
    stock: 12,
    images: "https://images.unsplash.com/photo-1593784991095-a205069470b6",
    featured: "yes",
  },
  {
    product_code: "PHN-APPL-IP15",
    name: "Apple iPhone 15",
    description:
      "A16 Bionic chip, 48MP main camera and USB-C. Sold with a Ghana-ready charger.",
    category: "Electronics",
    brand: "Apple",
    base_price: 12500,
    stock: 0,
    images: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab",
    featured: "no",
  },
];

const EXAMPLE_VARIANTS = [
  {
    product_code: "PHN-APPL-IP15",
    name: "128GB / Midnight",
    sku: "PHN-APPL-IP15-128-MID",
    price: 12500,
    stock: 6,
    attributes: "storage=128GB; colour=Midnight",
  },
  {
    product_code: "PHN-APPL-IP15",
    name: "256GB / Blue",
    sku: "PHN-APPL-IP15-256-BLU",
    price: 14200,
    stock: 3,
    attributes: "storage=256GB; colour=Blue",
  },
];

function addSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  headers: readonly string[],
  examples: Array<Record<string, string | number>>,
) {
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: COLUMN_WIDTHS[header] ?? 18,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 20;

  headerRow.eachCell((cell, columnNumber) => {
    const note = COLUMN_NOTES[`${sheetName}.${headers[columnNumber - 1]}`];
    if (note) cell.note = note;
  });

  for (const example of examples) {
    sheet.addRow(example);
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  return sheet;
}

function addNotesSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet("Notes");

  sheet.columns = [
    { header: "sheet", key: "sheet", width: 12 },
    { header: "column", key: "column", width: 16 },
    { header: "what to put in it", key: "note", width: 96 },
  ];

  sheet.getRow(1).font = { bold: true };

  for (const [key, note] of Object.entries(COLUMN_NOTES)) {
    const [sheetName, column] = key.split(".");
    sheet.addRow({ sheet: sheetName, column, note });
  }

  sheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

async function main() {
  const outputArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const outputPath = path.resolve(
    INVOCATION_DIR,
    outputArg ?? "catalog-template.xlsx",
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VBUY catalog importer";
  workbook.created = new Date();

  addSheet(workbook, PRODUCTS_SHEET, PRODUCT_HEADERS, EXAMPLE_PRODUCTS);
  addSheet(workbook, VARIANTS_SHEET, VARIANT_HEADERS, EXAMPLE_VARIANTS);
  addNotesSheet(workbook);

  await workbook.xlsx.writeFile(outputPath);

  console.log(`Wrote ${path.relative(INVOCATION_DIR, outputPath)}`);
  console.log("");
  console.log("The two example products are there to show the format.");
  console.log("Delete them, add your own rows, then run:");
  console.log("");
  console.log("  pnpm run catalog:import -- --file ./your-file.xlsx --dry-run");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
