import { Router, type IRouter } from "express";
import { requireAuth } from "../../lib/auth";
import { requireAdmin } from "../../lib/rbac";
import meRouter from "./me";
import adminsRouter from "./admins";
import rolesRouter from "./roles";
import ordersRouter from "./orders";
import catalogRouter from "./catalog";
import customersRouter from "./customers";
import analyticsRouter from "./analytics";
import contentRouter from "./content";

const router: IRouter = Router();

router.use(requireAuth, requireAdmin);
router.use(meRouter);
router.use(adminsRouter);
router.use(rolesRouter);
router.use(ordersRouter);
router.use(catalogRouter);
router.use(customersRouter);
router.use(analyticsRouter);
router.use(contentRouter);

export default router;
