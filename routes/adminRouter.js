import express from "express";
import { getAnalytics } from "../controllers/analyticsController.js";
import productRouter from "./productRouter.js";
import couponRouter from "./couponRouter.js";
import {
  revertRedemption,
  getAllRedemptions,
} from "../controllers/redemptionController.js";
import {
  createImportJob,
  getImportJobById,
} from "../controllers/importJobController.js";

import { uploadCsv } from "../middlewares/upload.js";
import { csvImportRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router({ mergeParams: true });

router.get("/analytics", getAnalytics);

router.get("/redemptions", getAllRedemptions);
router.patch("/redemptions/:id/revert", revertRedemption);

router.use("/products", productRouter);
router.use("/coupons", couponRouter);

router.post(
  "/coupons/import",
  csvImportRateLimiter,
  uploadCsv.single("file"),
  createImportJob
);

router.get("/coupons/import/:id", getImportJobById);

export default router;