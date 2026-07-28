---
name: Kumasi Store stack decisions
description: Tech stack, auth model, and routing choices for the Kumasi Store e-commerce project.
---

# Kumasi Store — Stack Decisions

## Frontend
- React + Vite at artifact path `/` (slug: `store`)
- Supabase auth client-side only: JWT from `supabase.auth.getSession()` forwarded as `Authorization: Bearer` to API
- Cart session ID stored in `localStorage` via `uuid` (`src/lib/cart.ts`)
- `@workspace/api-client-react` React Query hooks — base URL auto-resolved via `BASE_URL` env

## Backend
- Express 5 + Drizzle ORM + Replit's built-in PostgreSQL (NOT Supabase DB)
- Auth middleware: decode Supabase JWT locally (no full verification in Phase 1) — extract `sub` as userId
- Paystack: test mode only, `https://api.paystack.co`, Bearer `PAYSTACK_SECRET_KEY`
- Webhook HMAC-SHA512 of raw body vs `x-paystack-signature` header

**Why:** Replit's built-in DB is provisioned and zero-config; Supabase is auth-only to avoid split DB state.

## How to apply
- Never switch to Supabase DB — keep Drizzle pointing at Replit PostgreSQL
- Always use `BASE_URL` helper for API URLs in frontend, never hardcode `/api`
- Orders support guest checkout (`userId` nullable); `sessionId` in create-order pulls + clears cart
