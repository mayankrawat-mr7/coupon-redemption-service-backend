import "dotenv/config";
import mongoose from "mongoose";
import Coupon from "../models/couponModel.js";
import Redemption from "../models/redemptionModel.js";

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const coupons = await Coupon.find({
      code: { $in: ["RACE1", "RACE2", "RACE3", "RACE4"] },
    })
      .select("code maxUses usedCount perUserLimit startsAt expiresAt")
      .lean();

    const report = await Promise.all(
      coupons.map(async (coupon) => ({
        code: coupon.code,
        maxUses: coupon.maxUses,
        usedCount: coupon.usedCount,
        perUserLimit: coupon.perUserLimit,
        startsAt: coupon.startsAt,
        expiresAt: coupon.expiresAt,
        appliedRedemptions: await Redemption.countDocuments({
          couponId: coupon._id,
          status: "APPLIED",
        }),
      }))
    );

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(`Could not inspect race coupons: ${error.message}`);
  process.exitCode = 1;
});
