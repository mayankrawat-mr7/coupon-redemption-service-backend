import express from "express";
import { getAnalytics } from "../controllers/analyticsController.js";
import productRouter from "./productRouter.js";
import couponRouter from "./couponRouter.js";

import {
  revertRedemption,
} from "../controllers/redemptionController.js";

const router = express.Router({ mergeParams: true });

router.get("/analytics", getAnalytics);
router.patch(
  "/redemptions/:id/revert",
  revertRedemption
);
router.use("/products", productRouter);
router.use("/coupons", couponRouter);

export default router;