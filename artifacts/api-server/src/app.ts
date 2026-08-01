import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Honor X-Forwarded-For from the hosting reverse proxy (needed for Turnstile remoteip).
app.set("trust proxy", 1);

function parseCorsOrigins(): string[] | true {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw || raw === "*") {
    // Dev default: reflect any origin. Set CORS_ORIGINS in production.
    if (process.env.NODE_ENV === "production") {
      logger.warn("CORS_ORIGINS unset in production — denying cross-origin browser requests");
      return [];
    }
    return true;
  }
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

const corsOrigins = parseCorsOrigins();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
