import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contentBlocksTable } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";

const router: IRouter = Router();

/** Public homepage content — published blocks only. */
router.get("/content", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(contentBlocksTable)
    .where(and(eq(contentBlocksTable.published, true)))
    .orderBy(asc(contentBlocksTable.sortOrder));

  res.json(
    rows.map((r) => ({
      key: r.key,
      title: r.title,
      body: r.body,
      imageUrl: r.imageUrl,
      ctaLabel: r.ctaLabel,
      ctaHref: r.ctaHref,
      sortOrder: r.sortOrder,
    })),
  );
});

export default router;
