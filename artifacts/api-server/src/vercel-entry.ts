import type { Request, Response } from "express";
import app from "./app";
import { logger } from "./lib/logger";
import { bootstrapAdminsFromEnv, ensureRbacSeeded } from "./lib/rbac";
import { warnIfTurnstileDisabled } from "./lib/turnstile";

warnIfTurnstileDisabled();

let bootPromise: Promise<void> | null = null;

function ensureBootstrapped(): Promise<void> {
  if (!bootPromise) {
    bootPromise = (async () => {
      await ensureRbacSeeded();
      await bootstrapAdminsFromEnv();
      logger.info("RBAC seed and admin bootstrap complete (Vercel)");
    })().catch((err) => {
      bootPromise = null;
      logger.error({ err }, "Failed to seed RBAC / bootstrap admins on Vercel");
      throw err;
    });
  }
  return bootPromise;
}

/**
 * Vercel serverless handler — Express app without `listen()`.
 * Same `/api/*` routes as the long-running Node process.
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  await ensureBootstrapped();
  app(req, res);
}
