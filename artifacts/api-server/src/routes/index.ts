import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import brandsRouter from "./brands";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import addressesRouter from "./addresses";
import contentPublicRouter from "./content-public";
import storeConfigRouter from "./store-config";
import internalRouter from "./internal";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(brandsRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(addressesRouter);
router.use(contentPublicRouter);
router.use(storeConfigRouter);
router.use(internalRouter);
router.use("/admin", adminRouter);

export default router;
