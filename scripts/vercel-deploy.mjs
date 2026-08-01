/**
 * Non-interactive Vercel deploy from repo-root .env
 *
 * Usage:
 *   set VERCEL_TOKEN=...   (PowerShell: $env:VERCEL_TOKEN="...")
 *   node ./scripts/vercel-deploy.mjs
 *
 * Optional: VERCEL_ORG_ID, VERCEL_PROJECT_ID after first link.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function run(args, opts = {}) {
  const result = spawnSync("npx", ["--yes", "vercel@39.4.2", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, ...opts.env },
    input: opts.input,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`vercel ${args.join(" ")} failed (exit ${result.status})`);
  }
  return result.stdout ?? "";
}

function ensureLocalDefaults(fileEnv) {
  const updates = [];
  const next = { ...fileEnv };

  if (!next.GHS_ACCRA_DELIVERY_FEE?.trim()) {
    next.GHS_ACCRA_DELIVERY_FEE = "50";
    updates.push("GHS_ACCRA_DELIVERY_FEE=50");
  }
  if (!next.GHS_OUTSIDE_ACCRA_DELIVERY_FEE?.trim()) {
    next.GHS_OUTSIDE_ACCRA_DELIVERY_FEE = "100";
    updates.push("GHS_OUTSIDE_ACCRA_DELIVERY_FEE=100");
  }
  if (!next.CRON_SECRET?.trim()) {
    next.CRON_SECRET = randomBytes(24).toString("hex");
    updates.push(`CRON_SECRET=${next.CRON_SECRET}`);
  }
  if (!next.BASE_PATH?.trim()) {
    next.BASE_PATH = "/";
    updates.push("BASE_PATH=/");
  }

  if (updates.length) {
    writeFileSync(
      envPath,
      `${readFileSync(envPath, "utf8").replace(/\s*$/, "")}\n\n# Added by vercel-deploy.mjs\n${updates.join("\n")}\n`,
      "utf8",
    );
    console.log(`Updated .env with: ${updates.map((u) => u.split("=")[0]).join(", ")}`);
  }

  return next;
}

function requireToken() {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.error(`
Missing VERCEL_TOKEN.

1. Open https://vercel.com/account/tokens
2. Create a token (scope: Full Account or the team you'll deploy to)
3. In this terminal:

   PowerShell:
     $env:VERCEL_TOKEN="paste_token_here"
     node ./scripts/vercel-deploy.mjs

   Or one line:
     $env:VERCEL_TOKEN="paste_token_here"; node ./scripts/vercel-deploy.mjs
`);
    process.exit(1);
  }
  return token;
}

function upsertEnv(token, key, value, targets) {
  if (value == null || String(value).trim() === "") {
    console.log(`skip ${key} (empty)`);
    return;
  }
  for (const target of targets) {
    // Remove existing so re-runs are idempotent (ignore failures).
    spawnSync(
      "npx",
      ["--yes", "vercel@39.4.2", "env", "rm", key, target, "-y", "--token", token],
      { cwd: root, encoding: "utf8", shell: true, stdio: "ignore" },
    );
    run(["env", "add", key, target, "--token", token], { input: `${value}\n` });
    console.log(`set ${key} → ${target}`);
  }
}

const token = requireToken();
const fileEnv = ensureLocalDefaults(loadEnvFile(envPath));

const required = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_JWT_SECRET",
  "ADMIN_EMAILS",
  "VITE_MOMO_MERCHANT_NUMBER",
  "GHS_ACCRA_DELIVERY_FEE",
  "GHS_OUTSIDE_ACCRA_DELIVERY_FEE",
  "CRON_SECRET",
];

for (const key of required) {
  if (!fileEnv[key]?.trim()) {
    console.error(`Missing required ${key} in .env`);
    process.exit(1);
  }
}

console.log("Linking / creating Vercel project…");
run([
  "link",
  "--yes",
  "--token",
  token,
  "--project",
  "vbuy",
]);

const productionAndPreview = ["production", "preview"];
const productionOnly = ["production"];

const envMap = [
  ["DATABASE_URL", productionAndPreview],
  ["SUPABASE_URL", productionAndPreview],
  ["SUPABASE_ANON_KEY", productionAndPreview],
  ["SUPABASE_JWT_SECRET", productionAndPreview],
  ["ADMIN_EMAILS", productionAndPreview],
  ["VITE_MOMO_MERCHANT_NUMBER", productionAndPreview],
  ["MOMO_MERCHANT_NUMBER", productionAndPreview, fileEnv.VITE_MOMO_MERCHANT_NUMBER],
  ["GHS_ACCRA_DELIVERY_FEE", productionAndPreview],
  ["GHS_OUTSIDE_ACCRA_DELIVERY_FEE", productionAndPreview],
  ["CRON_SECRET", productionAndPreview],
  ["UNPAID_ORDER_EXPIRY_HOURS", productionAndPreview, fileEnv.UNPAID_ORDER_EXPIRY_HOURS || "24"],
  ["BASE_PATH", productionAndPreview, "/"],
  ["LOG_LEVEL", productionAndPreview, fileEnv.LOG_LEVEL || "info"],
  ["VITE_TURNSTILE_SITE_KEY", productionAndPreview],
  ["TURNSTILE_SECRET_KEY", productionAndPreview],
  ["VITE_CONTACT_PHONE", productionAndPreview],
  ["VITE_CONTACT_EMAIL", productionAndPreview],
  ["VITE_CONTACT_WHATSAPP", productionAndPreview],
];

for (const [key, targets, override] of envMap) {
  upsertEnv(token, key, override ?? fileEnv[key], targets);
}

console.log("Deploying to production…");
const deployOut = run(["deploy", "--prod", "--yes", "--token", token]);
const urlMatch = deployOut.match(/https:\/\/[^\s]+/);
const url = urlMatch?.[0];

if (url) {
  const origin = new URL(url).origin;
  console.log(`Setting CORS_ORIGINS=${origin}`);
  upsertEnv(token, "CORS_ORIGINS", origin, productionOnly);
  console.log("Redeploying so CORS_ORIGINS is applied…");
  run(["deploy", "--prod", "--yes", "--token", token]);
  console.log(`\nLive: ${origin}`);
  console.log(`Add Supabase redirect: ${origin}/auth/callback`);
} else {
  console.log(deployOut);
  console.log("Deploy finished — set CORS_ORIGINS to your production origin and redeploy if needed.");
}
