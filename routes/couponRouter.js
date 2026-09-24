import express from "express";

import {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  pauseCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";

// import { verifyToken } from "../middlewares/verifyToken.js";
import {requireRole}from "../middlewares/requireRole.js";

import { validateRequest } from "../middlewares/validations.js";

import {
  createCouponSchema,
  updateCouponSchema,
} from "../utils/validationSchemas/couponSchema.js";

const router = express.Router();

// All coupon routes are admin-only
// router.use(verifyToken("access"));
router.use(requireRole("admin"));

// Coupon CRUD
router
  .route("/")
  .get(getAllCoupons)
  .post(validateRequest(createCouponSchema), createCoupon);

router
  .route("/:id")
  .get(getCouponById)
  .put(validateRequest(updateCouponSchema), updateCoupon)
  .delete(deleteCoupon);

// Pause coupon
router.patch("/:id/pause", pauseCoupon);

export default router;