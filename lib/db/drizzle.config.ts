import { defineConfig } from "drizzle-kit";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, "..", "..");

// Local development keeps secrets in a repo-root .env. On Replit the file is
// absent and the environment already carries them, so a miss is not an error.
try {
  process.loadEnvFile(path.join(repoRoot, ".env"));
} catch {
  // no .env file — fall through to the real environment
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
