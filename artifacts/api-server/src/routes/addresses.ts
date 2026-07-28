import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { addressesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateAddressBody } from "@workspace/api-zod";

const router: IRouter = Router();

function getUserId(req: import("express").Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.sub as string;
  } catch {
    return null;
  }
}

// GET /addresses
router.get("/addresses", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.json([]);
    return;
  }

  const rows = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId))
    .orderBy(addressesTable.createdAt);

  res.json(
    rows.map((r) => ({
      ...r,
      lat: r.lat ? parseFloat(r.lat) : null,
      lng: r.lng ? parseFloat(r.lng) : null,
    }))
  );
});

// POST /addresses
router.post("/addresses", async (req, res): Promise<void> => {
  const parsed = CreateAddressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = getUserId(req);
  const { digitalAddress, notes, lat, lng } = parsed.data;

  const [address] = await db
    .insert(addressesTable)
    .values({
      userId: userId ?? parsed.data.userId ?? null,
      digitalAddress,
      notes: notes ?? null,
      lat: lat != null ? String(lat) : null,
      lng: lng != null ? String(lng) : null,
    })
    .returning();

  res.status(201).json({
    ...address,
    lat: address.lat ? parseFloat(address.lat) : null,
    lng: address.lng ? parseFloat(address.lng) : null,
  });
});

// DELETE /addresses/:id
router.delete("/addresses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid address id" });
    return;
  }

  await db.delete(addressesTable).where(eq(addressesTable.id, id));
  res.sendStatus(204);
});

export default router;
