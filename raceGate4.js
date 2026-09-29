import "dotenv/config";
import mongoose from "mongoose";
import Coupon from "./models/couponModel.js";
import Redemption from "./models/redemptionModel.js";
import { loadRaceTestTokens } from "./utils/raceTestTokens.js";

const REQUEST_COUNT = 20;
const apiBaseUrl = (process.env.API_BASE_URL || "http://localhost:1234").replace(
  /\/$/,
  ""
);

const main = async () => {
  const [customerToken] = await loadRaceTestTokens();
  const customerId = JSON.parse(
    Buffer.from(customerToken.split(".")[1], "base64url").toString("utf8")
  ).id;

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const coupon = await Coupon.findOne({ code: "RACE4" });
    if (!coupon) throw new Error("Coupon RACE4 does not exist.");

    const now = new Date();
    if (now < coupon.startsAt || now > coupon.expiresAt) {
      throw new Error("Coupon RACE4 must be within its start and expiry dates.");
    }
    if (coupon.perUserLimit !== 1) {
      throw new Error("Set RACE4 perUserLimit to 1 to exercise transaction rollback.");
    }
    if (coupon.maxUses - coupon.usedCount < REQUEST_COUNT) {
      throw new Error("RACE4 needs at least 20 remaining global uses for this test.");
    }

    const beforeUsedCount = coupon.usedCount;
    const beforeAppliedCount = await Redemption.countDocuments({
      couponId: coupon._id,
      userId: customerId,
      status: "APPLIED",
    });
    if (beforeAppliedCount !== 0) {
      throw new Error("The generated test customer already has an RACE4 redemption; generate a fresh token file.");
    }

    console.log("Gate 4: force per-user rejection after the coupon increment");
    console.log("Checking that the transaction rolls back failed increments...");

    const results = await Promise.all(
      Array.from({ length: REQUEST_COUNT }, async (_, index) => {
        try {
          const response = await fetch(`${apiBaseUrl}/api/users/redemptions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${customerToken}`,
            },
            body: JSON.stringify({
              code: "RACE4",
              orderId: `RACE4-ORDER-${index}`,
              orderAmount: 100,
            }),
          });
          return { status: response.status, body: await response.json() };
        } catch (error) {
          return { status: 0, body: { message: error.message } };
        }
      })
    );

    const afterCoupon = await Coupon.findById(coupon._id).lean();
    const afterAppliedCount = await Redemption.countDocuments({
      couponId: coupon._id,
      userId: customerId,
      status: "APPLIED",
    });
    const usedDelta = afterCoupon.usedCount - beforeUsedCount;
    const appliedDelta = afterAppliedCount - beforeAppliedCount;
    const successes = results.filter(({ status }) => status === 201).length;
    const otherStatuses = results.filter(({ status }) => status !== 201 && status !== 400);
    const passed =
      successes === 1 &&
      usedDelta === 1 &&
      appliedDelta === 1 &&
      !otherStatuses.length;

    console.log(`Requests: ${results.length}`);
    console.log(`Successes: ${successes}`);
    console.log(`Failed increments rolled back: ${usedDelta === appliedDelta ? "yes" : "NO"}`);
    console.log(`Coupon usedCount delta: ${usedDelta}`);
    console.log(`Applied redemption delta: ${appliedDelta}`);
    console.log(
      passed
        ? "PASS: usage count matches committed redemption rows."
        : "FAIL: transaction audit did not match the expected one committed redemption."
    );
    if (otherStatuses.length) {
      console.log(
        "Unexpected HTTP statuses:",
        otherStatuses.map(({ status }) => status)
      );
    }
    if (!passed) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(`Gate 4 setup/test error: ${error.message}`);
  process.exitCode = 1;
});
