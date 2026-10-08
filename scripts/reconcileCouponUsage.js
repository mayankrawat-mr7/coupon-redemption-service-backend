import "dotenv/config";
import mongoose from "mongoose";
import Coupon from "../models/couponModel.js";
import Redemption from "../models/redemptionModel.js";

const applyChanges = process.argv.includes("--apply");

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  try {
    // Only active redemptions consume coupon capacity. Reverted records are
    // deliberately excluded so the coupon counter and analytics agree.
    const [coupons, appliedUsage] = await Promise.all([
      Coupon.find({}).select("_id code usedCount").lean(),
      Redemption.aggregate([
        { $match: { status: "APPLIED" } },
        { $group: { _id: "$couponId", usedCount: { $sum: 1 } } },
      ]),
    ]);

    const usageByCouponId = new Map(
      appliedUsage.map(({ _id, usedCount }) => [String(_id), usedCount])
    );
    const changes = coupons
      .map((coupon) => ({
        _id: coupon._id,
        code: coupon.code,
        from: coupon.usedCount ?? 0,
        to: usageByCouponId.get(String(coupon._id)) ?? 0,
      }))
      .filter(({ from, to }) => from !== to);

    console.log(
      JSON.stringify(
        {
          mode: applyChanges ? "apply" : "dry-run",
          couponsChecked: coupons.length,
          couponsNeedingUpdate: changes.length,
          changes,
        },
        null,
        2
      )
    );

    if (!applyChanges || changes.length === 0) return;

    const result = await Coupon.bulkWrite(
      changes.map(({ _id, to }) => ({
        updateOne: { filter: { _id }, update: { $set: { usedCount: to } } },
      }))
    );
    console.log(`Updated ${result.modifiedCount} coupon usage counters.`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(`Could not reconcile coupon usage: ${error.message}`);
  process.exitCode = 1;
});
