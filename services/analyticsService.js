import Coupon from "../models/couponModel.js";
import Redemption from "../models/redemptionModel.js";

export const getAnalytics = async () => {
  const [
    totalCoupons,
    activeCoupons,
    pausedCoupons,
    totalRedemptions,
    appliedRedemptions,
    revertedRedemptions,
  ] = await Promise.all([
    Coupon.countDocuments(),

    Coupon.countDocuments({
      status: "ACTIVE",
    }),

    Coupon.countDocuments({
      status: "PAUSED",
    }),

    Redemption.countDocuments(),

    Redemption.countDocuments({
      status: "APPLIED",
    }),

    Redemption.countDocuments({
      status: "REVERTED",
    }),
  ]);

  const usageStats = await Coupon.aggregate([
    {
      $group: {
        _id: null,
        totalUsage: { $sum: "$usedCount" },
        totalUsageLimit: { $sum: "$maxUses" },
      },
    },
  ]);

  return {
    coupons: {
      total: totalCoupons,
      active: activeCoupons,
      paused: pausedCoupons,
    },

    redemptions: {
      total: totalRedemptions,
      applied: appliedRedemptions,
      reverted: revertedRedemptions,
    },

    usage: {
      totalUsed: usageStats[0]?.totalUsage || 0,
      totalLimit: usageStats[0]?.totalUsageLimit || 0,
    },
  };
};