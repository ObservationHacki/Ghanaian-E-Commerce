import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contentBlocksTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requirePermission, writeAudit } from "../../lib/rbac";

const router: IRouter = Router();

const DEFAULT_BLOCKS = [
  {
    key: "hero",
    title: "Tech that moves with Ghana",
    body: "Laptops, phones and accessories delivered across the country — paid with MoMo or card.",
    imageUrl:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=80",
    ctaLabel: "Shop now",
    ctaHref: "/shop",
    sortOrder: 0,
  },
  {
    key: "announcement",
    title: "Free delivery with VBUY",
    body: "On orders over GHS 500 this week.",
    imageUrl: null,
    ctaLabel: null,
    ctaHref: null,
    sortOrder: 1,
  },
];

async function ensureDefaults() {
  for (const block of DEFAULT_BLOCKS) {
    await db
      .insert(contentBlocksTable)
      .values({
        ...block,
        published: true,
      })
      .onConflictDoNothing({ target: contentBlocksTable.key });
  }
}

router.get(
  "/content",
  requirePermission("content:read"),
  async (_req, res): Promise<void> => {
    await ensureDefaults();
    const rows = await db
      .select()
      .from(contentBlocksTable)
      .orderBy(asc(contentBlocksTable.sortOrder));

    res.json(
      rows.map((r) => ({
        ...r,
        updatedAt: r.updatedAt.toISOString(),
      })),
    );
  },
);

const blockSchema = z.object({
  key: z.string().min(1).optional(),
  title: z.string().min(1),
  body: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  ctaLabel: z.string().nullable().optional(),
  ctaHref: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  published: z.boolean().optional(),
});

router.post(
  "/content",
  requirePermission("content:write"),
  async (req, res): Promise<void> => {
    const parsed = blockSchema.extend({ key: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [created] = await db
      .insert(contentBlocksTable)
      .values({
        key: parsed.data.key,
        title: parsed.data.title,
        body: parsed.data.body ?? "",
        imageUrl: parsed.data.imageUrl ?? null,
        ctaLabel: parsed.data.ctaLabel ?? null,
        ctaHref: parsed.data.ctaHref ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        published: parsed.data.published ?? true,
      })
      .returning();

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "content.create",
      resourceType: "content_block",
      resourceId: created.id,
    });

    res.status(201).json({
      ...created,
      updatedAt: created.updatedAt.toISOString(),
    });
  },
);

router.patch(
  "/content/:id",
  requirePermission("content:write"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = blockSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(contentBlocksTable)
      .set({
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
        ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl } : {}),
        ...(parsed.data.ctaLabel !== undefined ? { ctaLabel: parsed.data.ctaLabel } : {}),
        ...(parsed.data.ctaHref !== undefined ? { ctaHref: parsed.data.ctaHref } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        ...(parsed.data.published !== undefined ? { published: parsed.data.published } : {}),
        updatedAt: new Date(),
      })
      .where(eq(contentBlocksTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Content block not found" });
      return;
    }

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "content.update",
      resourceType: "content_block",
      resourceId: id,
    });

    res.json({
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
    });
  },
);

export default router;
