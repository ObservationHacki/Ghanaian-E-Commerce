---
name: Storefront design system
description: Token names, layout primitives and component conventions for the Kumasi Store frontend redesign.
---

# Storefront Design System

Source of truth: `artifacts/store/src/index.css`.

## Palette

- Brand accent is **Ghana green `#007A3D`** — `--accent` / `bg-accent` / `text-accent-ink`.
  Use it sparingly: primary CTAs, badges, active filters, links. Never for large surfaces.
- Neutral ramp is the backbone: `surface`, `surface-sunken` (section backgrounds),
  `ink` / `ink-muted` / `ink-subtle` (text hierarchy), `hairline` (all borders).
- Prefer these over raw Tailwind greys and over the older `muted` / `secondary`
  shadcn tokens, which remain only so stock shadcn primitives keep working.
- Never hardcode `#1D1D1F` or `#F5F5F7` again — that was the pre-redesign pattern.

## Typography

Fluid scale defined in `@theme`, use the semantic classes, not `text-4xl` etc:
`text-display` (hero) → `text-headline` (section) → `text-title` → `text-lede` → `text-caption`.

## Layout primitives

- `.container-page` — standard page gutter (max 1440px). `.container-narrow` for funnel pages.
- `.section-y` / `.section-y-sm` — vertical rhythm between homepage sections.
- `<Section>` and `<SectionHeader>` in `components/commerce/section.tsx` wrap both.

## Components

- **One** product card: `components/commerce/product-card.tsx`. Do not inline new ones.
- Grids go through `<ProductGrid>` / `<ProductRail>` so loading states stay consistent.
- `<Reveal>` wraps scroll-in animation and already respects `prefers-reduced-motion`.
- Page shells: `AuthShell` (login/register), `AccountShell` (all `/account/*`, handles the
  loading and signed-out states centrally).

## Gotchas

- `ProductSummary` has no variant ids, so quick-add resolves the detail first —
  use `useQuickAdd()` rather than calling `useAddCartItem` from a card.
- Ratings and "was" prices are deterministic placeholders derived from product id
  (`lib/catalog.ts`). Replace with real API fields when reviews/discounts ship.
- Cart mutations must invalidate `['cart', sessionId]` or the navbar badge goes stale.
- Order statuses come from `lib/order-status.ts`; the API sends `order_received`
  (an earlier timeline hardcoded `received` and never advanced).
- Wishlist is localStorage-only via `WishlistProvider` — no API persistence yet.
