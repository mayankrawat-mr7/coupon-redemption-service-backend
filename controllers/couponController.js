import { catchAsync } from "../utils/helpers.js";
import AppSuccess from "../middlewares/appSuccess.js";

import {
  createCoupon as createCouponService,
  getAllCoupons as getAllCouponsService,
  getCouponById as getCouponByIdService,
  updateCoupon as updateCouponService,
  pauseCoupon as pauseCouponService,
  deleteCoupon as deleteCouponService,
} from "../services/couponService.js";

// Create coupon
export const createCoupon = catchAsync(async (req, res) => {
  const coupon = await createCouponService(req.body);

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

  return new AppSuccess(res, {
    message: "Coupon updated successfully",
    data: coupon,
  });
});

// Pause coupon
export const pauseCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;

  const coupon = await pauseCouponService(id);

  return new AppSuccess(res, {
    message: "Coupon paused successfully",
    data: coupon,
  });
});

// Delete coupon
export const deleteCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;

  const deleted = await deleteCouponService(id);

  return new AppSuccess(res, {
    message: "Coupon deleted successfully",
    data: { deleted },
  });
});