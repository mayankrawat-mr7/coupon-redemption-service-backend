import "dotenv/config";
import mongoose from "mongoose";
import Coupon from "../models/couponModel.js";
import Redemption from "../models/redemptionModel.js";

const RACE_CODES = ["RACE1", "RACE2", "RACE3", "RACE4"];

const main = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset race coupons in production.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const coupons = await Coupon.find({ code: { $in: RACE_CODES } }).select(
      "_id code"
    );
    const couponIds = coupons.map((coupon) => coupon._id);

    const deleted = await Redemption.deleteMany({
      couponId: { $in: couponIds },
    });
    const updated = await Coupon.updateMany(
      { _id: { $in: couponIds } },
      { $set: { usedCount: 0 } }
    );

    console.log(
      `Coupons reset: ${updated.modifiedCount} (found ${coupons.length})`
    );
    console.log(`Redemptions deleted: ${deleted.deletedCount}`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(`Could not reset race coupons: ${error.message}`);
  process.exitCode = 1;
});