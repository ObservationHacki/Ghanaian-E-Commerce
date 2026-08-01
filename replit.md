# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm run dev:api` — run the API server (port 5000)
- `pnpm run dev:store` — run the storefront (port 5173, proxies `/api` to the API server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm run db:push` — push DB schema changes (dev only)
- `pnpm run catalog:template` — write `catalog-template.xlsx`, the catalog spreadsheet format
- `pnpm run catalog:import --file catalog.xlsx [--dry-run]` — load the catalog from a spreadsheet
- Required env: `DATABASE_URL` — Postgres connection string

### Local development

Copy `.env.example` to `.env` at the repo root, then run the two dev commands in
separate terminals. Both processes read that file, and real environment variables
(such as Replit Secrets) always take precedence over it.

The storefront calls the API with same-origin `/api` paths. In production Replit's
application router handles that; locally `vite.config.ts` proxies to
`API_PROXY_TARGET`. `STORE_PORT` exists so both processes can share one `.env`
without fighting over `PORT`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema (source of truth): `lib/db/src/schema/`
- API contract: `lib/api-spec/openapi.yaml`, with hooks generated into `lib/api-client-react`
- Design tokens and theme: `artifacts/store/src/index.css`
- Catalog spreadsheet importer: `scripts/src/catalog/`

### Catalog loading

The catalog is populated from a spreadsheet, since the API exposes no write
endpoints for products, categories or brands. `scripts/src/catalog/import.ts`
writes through Drizzle directly.

`products.external_id` is the spreadsheet's identity key (the `product_code`
column), so re-importing updates rows rather than duplicating them. A product
with no rows in the `Variants` sheet gets one default variant generated from its
`base_price` and `stock`, because `inStock` is derived from a variant join.

Variants dropped from the sheet are deleted only when nothing references them;
`cart_items` and `order_items` point at `product_variants` with no `ON DELETE`
rule, so referenced ones are set to 0 stock instead.

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `pnpm-workspace.yaml` strips platform binaries for every target except
  linux-x64 and win32-x64. Adding a third dev platform (macOS, ARM) means
  removing that platform's `"-"` overrides for rollup, esbuild, lightningcss,
  and `@tailwindcss/oxide`, or installs will fail with a missing native module.
- Google sign-in is Supabase OAuth. Enable the Google provider in the Supabase
  dashboard and whitelist `/auth/callback` on every host you serve the
  storefront from (local + production). No Google client secret belongs in
  `.env` — only Supabase holds those.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
