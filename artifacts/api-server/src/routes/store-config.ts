import { Router, type IRouter } from "express";
import { getDeliveryFeeConfig } from "../lib/delivery-fee";

const router: IRouter = Router();

/** Public storefront config (safe non-secret values only). */
router.get("/store-config", (_req, res): void => {
  const momoMerchantNumber = (
    process.env.VITE_MOMO_MERCHANT_NUMBER ||
    process.env.MOMO_MERCHANT_NUMBER ||
    ""
  ).trim();

  const fees = getDeliveryFeeConfig();

  res.json({
    momoMerchantNumber,
    accraDeliveryFee: fees.accra,
    outsideAccraDeliveryFee: fees.outsideAccra,
    deliveryFeesConfigured: fees.configured,
  });
});

export default router;
