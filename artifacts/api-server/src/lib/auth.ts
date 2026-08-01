import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type AuthUser = {
  userId: string;
  email: string | null;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser | null;
      admin?: {
        id: number;
        userId: string;
        email: string;
        roleId: number;
        roleSlug: string;
        permissions: string[];
      };
    }
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  if (!url) {
    throw new Error("SUPABASE_URL must be set for JWT verification");
  }
  return url;
}

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${getSupabaseUrl()}/auth/v1/.well-known/jwks.json`),
    );
  }
  return jwks;
}

async function verifyWithSecret(token: string): Promise<JWTPayload> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error("No SUPABASE_JWT_SECRET configured");
  }
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(secret),
    {
      algorithms: ["HS256"],
      audience: "authenticated",
    },
  );
  return payload;
}

async function verifyWithJwks(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getJwks(), {
    audience: "authenticated",
  });
  return payload;
}

export async function verifyAccessToken(token: string): Promise<AuthUser> {
  let payload: JWTPayload;

  if (process.env.SUPABASE_JWT_SECRET) {
    try {
      payload = await verifyWithSecret(token);
    } catch {
      payload = await verifyWithJwks(token);
    }
  } else {
    payload = await verifyWithJwks(token);
  }

  const userId = typeof payload.sub === "string" ? payload.sub : null;
  if (!userId) {
    throw new Error("Token missing subject");
  }

  const email =
    typeof payload.email === "string"
      ? payload.email
      : typeof (payload as { user_metadata?: { email?: string } }).user_metadata
            ?.email === "string"
        ? (payload as { user_metadata: { email: string } }).user_metadata.email
        : null;

  return { userId, email };
}

/** Optional auth — attaches authUser when a valid Bearer token is present. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  req.authUser = null;
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  try {
    req.authUser = await verifyAccessToken(header.slice(7));
  } catch {
    req.authUser = null;
  }
  next();
}

/** Requires a valid verified JWT. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    req.authUser = await verifyAccessToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function getAuthUserId(req: Request): string | null {
  return req.authUser?.userId ?? null;
}
