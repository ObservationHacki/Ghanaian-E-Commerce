import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { addressesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { CreateAddressBody } from "@workspace/api-zod";
import { optionalAuth, getAuthUserId, requireAuth } from "../lib/auth";

const router: IRouter = Router();

function formatAddress(row: typeof addressesTable.$inferSelect) {
  return {
    id: row.id,
    digitalAddress: row.digitalAddress,
    region: row.region,
    district: row.district,
    notes: row.notes,
    userId: row.userId,
  };
}

// GET /addresses
router.get("/addresses", optionalAuth, async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.json([]);
    return;
  }

  const rows = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId))
    .orderBy(addressesTable.createdAt);

  res.json(rows.map(formatAddress));
});

// POST /addresses
router.post("/addresses", optionalAuth, async (req, res): Promise<void> => {
  const parsed = CreateAddressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = getAuthUserId(req);
  const { digitalAddress, region, district, notes } = parsed.data;

  const [address] = await db
    .insert(addressesTable)
    .values({
      userId: userId ?? parsed.data.userId ?? null,
      digitalAddress,
      region,
      district,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(formatAddress(address));
});

// DELETE /addresses/:id
router.delete("/addresses/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid address id" });
    return;
  }

  const userId = getAuthUserId(req)!;
  await db
    .delete(addressesTable)
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
  res.sendStatus(204);
});

export default router;
