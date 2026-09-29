import Coupon from "../models/couponModel.js";
import AppError from "../middlewares/appError.js";
import {APIFeatures} from "../utils/apiFeatures.js";

// Create coupon
export const createCoupon = async (couponData) => {
  const existingCoupon = await Coupon.findOne({
    code: couponData.code.toUpperCase(),
  });

  if (existingCoupon) {
    throw new AppError("Coupon code already exists", 409);
  }

  const coupon = await Coupon.create({
    ...couponData,
    code: couponData.code.toUpperCase(),
  });

  return coupon;
};

// Get all coupons
export const getAllCoupons = async (query) => {
  const features = new APIFeatures(Coupon.find(), query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const coupons = await features.query;

  return coupons;
};

// Get coupon by ID
export const getCouponById = async (couponId) => {
  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    throw new AppError("Coupon not found", 404);
  }

  return coupon;
};

// Update coupon
export const updateCoupon = async (couponId, updateData) => {
  if (updateData.usedCount !== undefined) {
    delete updateData.usedCount;
  }

  if (updateData.code) {
    updateData.code = updateData.code.toUpperCase();

    const existingCoupon = await Coupon.findOne({
      code: updateData.code,
      _id: { $ne: couponId },
    });

    if (existingCoupon) {
      throw new AppError("Coupon code already exists", 409);
    }
  }

  const coupon = await Coupon.findByIdAndUpdate(
    couponId,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!coupon) {
    throw new AppError("Coupon not found", 404);
  }

  return coupon;
};

// Delete coupon
export const deleteCoupon = async (couponId) => {
  const coupon = await Coupon.findByIdAndDelete(couponId);

  if (!coupon) {
    throw new AppError("Coupon not found", 404);
  }

  return coupon;
};
