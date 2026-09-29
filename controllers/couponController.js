import { catchAsync } from "../utils/helpers.js";
import AppSuccess from "../middlewares/appSuccess.js";
import { logSuccess } from "../utils/logger.js";

import {
  createCoupon as createCouponService,
  getAllCoupons as getAllCouponsService,
  getCouponById as getCouponByIdService,
  updateCoupon as updateCouponService,
  deleteCoupon as deleteCouponService,
} from "../services/couponService.js";

// Create coupon
export const createCoupon = catchAsync(async (req, res) => {
  const coupon = await createCouponService(req.body);
  logSuccess(req, "Coupon created", {
    couponId: coupon.id || coupon._id?.toString(),
  });

  return new AppSuccess(res, {
    statusCode: 201,
    message: "Coupon created successfully",
    data: coupon,
  });
});

// Get all coupons
export const getAllCoupons = catchAsync(async (req, res) => {
  const coupons = await getAllCouponsService(req.query);

  return new AppSuccess(res, {
    message: "Coupons fetched successfully",
    data: coupons,
  });
});

// Get coupon by ID
export const getCouponById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const coupon = await getCouponByIdService(id);

  return new AppSuccess(res, {
    message: "Coupon fetched successfully",
    data: coupon,
  });
});

// Update coupon
export const updateCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;

  const coupon = await updateCouponService(id, req.body);
  logSuccess(req, "Coupon updated", { couponId: id });

  return new AppSuccess(res, {
    message: "Coupon updated successfully",
    data: coupon,
  });
});

// Delete coupon
export const deleteCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;

  const deleted = await deleteCouponService(id);
  logSuccess(req, "Coupon deleted", { couponId: id });

  return new AppSuccess(res, {
    message: "Coupon deleted successfully",
    data: { deleted },
  });
});
