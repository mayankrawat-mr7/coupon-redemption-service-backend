import express from "express";

import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  pauseCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";

import { validateRequest } from "../middlewares/validations.js";

import {
  createCouponSchema,
  updateCouponSchema,
} from "../utils/validationSchemas/couponSchema.js";

const router = express.Router();

router
  .route("/")
  .get(getAllCoupons)
  .post(
    validateRequest(createCouponSchema),
    createCoupon
  );

router
  .route("/:id")
  .get(getCouponById)
  .put(
    validateRequest(updateCouponSchema),
    updateCoupon
  )
  .delete(deleteCoupon);

router.patch("/:id/pause", pauseCoupon);

export default router;