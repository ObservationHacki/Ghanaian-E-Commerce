import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { brandsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/brands", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(brandsTable)
    .orderBy(brandsTable.name);

  res.json(rows);
});

export default router;
