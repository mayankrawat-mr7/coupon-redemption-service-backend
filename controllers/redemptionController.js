import { catchAsync } from "../utils/helpers.js";
import AppSuccess from "../middlewares/appSuccess.js";
import { logSuccess } from "../utils/logger.js";

import {
  redeemCoupon as redeemCouponService,
  getMyRedemptions as getMyRedemptionsService,
  revertRedemption as revertRedemptionService,
  getAllRedemptions as getAllRedemptionsService,
} from "../services/redemptionService.js";


// Get all redemptions (admin)
export const getAllRedemptions = catchAsync(async (req, res) => {
  const redemptions = await getAllRedemptionsService(req.query);

  return new AppSuccess(res, {
    message: "Redemptions fetched successfully",
    data: redemptions,
  });
});
// Redeem coupon
export const redeemCoupon = catchAsync(async (req, res) => {
  const { code, orderId } = req.body;
  const userId = req.user.id;

  const result = await redeemCouponService(
    userId,
    code,
    orderId
  );
  logSuccess(req, "Coupon redeemed", {
    userId,
    couponId: result.coupon.id || result.coupon._id?.toString(),
    redemptionId:
      result.redemption.id || result.redemption._id?.toString(),
  });

  return new AppSuccess(res, {
    statusCode: 201,
    message: "Coupon redeemed successfully",
    data: result,
  });
});

// Get customer's redemption history
export const getMyRedemptions = catchAsync(async (req, res) => {
  const userId = req.user.id;

  const redemptions = await getMyRedemptionsService(userId);

  return new AppSuccess(res, {
    message: "Redemption history fetched successfully",
    data: redemptions,
  });
});
export const revertRedemption = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await revertRedemptionService(id);
  logSuccess(req, "Redemption reverted", {
    actorId: req.user.id,
    redemptionId: id,
  });

  return new AppSuccess(res, {
    message: "Redemption reverted successfully",
    data: result,
  });
});
