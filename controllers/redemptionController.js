import { catchAsync } from "../utils/helpers.js";
import AppSuccess from "../middlewares/appSuccess.js";

import {
  redeemCoupon as redeemCouponService,
  getMyRedemptions as getMyRedemptionsService,
  revertRedemption as revertRedemptionService,
} from "../services/redemptionService.js";

// Redeem coupon
export const redeemCoupon = catchAsync(async (req, res) => {
  const { code, orderId } = req.body;
  const userId = req.user.id;

  const result = await redeemCouponService(
    userId,
    code,
    orderId
  );

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

  return new AppSuccess(res, {
    message: "Redemption reverted successfully",
    data: result,
  });
});