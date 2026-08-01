import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapAdminsFromEnv, ensureRbacSeeded } from "./lib/rbac";
import { warnIfTurnstileDisabled } from "./lib/turnstile";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function boot() {
  warnIfTurnstileDisabled();

  try {
    await ensureRbacSeeded();
    await bootstrapAdminsFromEnv();
    logger.info("RBAC seed and admin bootstrap complete");
  } catch (err) {
    logger.error({ err }, "Failed to seed RBAC / bootstrap admins");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

void boot();
