import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import brandsRouter from "./brands";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import addressesRouter from "./addresses";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(brandsRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(addressesRouter);
router.use(paymentsRouter);

export default router;
