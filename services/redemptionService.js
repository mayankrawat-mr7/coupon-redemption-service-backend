import mongoose from "mongoose";
import Coupon from "../models/couponModel.js";
import Redemption from "../models/redemptionModel.js";
import AppError from "../middlewares/appError.js";
import {APIFeatures} from "../utils/apiFeatures.js";
// Redeem coupon
// True for MongoDB duplicate-key errors (E11000), including ones surfaced from
// inside a transaction.
const isDuplicateKeyError = (error) =>
  error?.code === 11000 || error?.codeName === "DuplicateKey";

// Gates 2 + 3: the partial unique indexes on Redemption are the real enforcement.
// When one fires the transaction has already aborted (usedCount rolled back), so
// we look at what is actually committed:
//  - same user + same orderId  -> it's a client retry: return the ORIGINAL redemption
//  - otherwise                 -> the user already used this coupon: clean business error
const resolveDuplicateRedemption = async (coupon, userId, orderId) => {
  const original = await Redemption.findOne({
    couponId: coupon._id,
    userId,
    orderId,
    status: "APPLIED",
  });

  if (original) {
    const current = await Coupon.findById(coupon._id);
    return { redemption: original, coupon: current ?? coupon };
  }

  throw new AppError("You have already redeemed this coupon", 409, {
    errors: [
      { field: "code", message: "You have already redeemed this coupon" },
    ],
  });
};

const roundCurrency = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

const calculateDiscount = (coupon, orderAmount) => {
  const rawDiscount = coupon.discountType === "PERCENT"
    ? (orderAmount * coupon.discountValue) / 100
    : coupon.discountValue;
  const discountAmount = roundCurrency(Math.min(rawDiscount, orderAmount));

  return {
    discountAmount,
    finalAmount: roundCurrency(orderAmount - discountAmount),
  };
};

export const redeemCoupon = async (userId, code, orderId, orderAmount) => {
  // 1. Find coupon
  const coupon = await Coupon.findOne({
    code: code.toUpperCase(),
  });

  if (!coupon) {
    throw new AppError("Coupon not found", 404);
  }

  // 2. Check coupon dates
  const now = new Date();

  if (now < coupon.startsAt) {
    throw new AppError("Coupon is not active yet", 400);
  }

  if (now > coupon.expiresAt) {
    throw new AppError("Coupon has expired", 400);
  }

  const amounts = calculateDiscount(coupon, orderAmount);

  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      // 3. Gate 3: Check idempotency first
      const existingRedemption = await Redemption.findOne({
        couponId: coupon._id,
        userId,
        orderId,
        status: "APPLIED",
      }).session(session);

      if (existingRedemption) {
        result = {
          redemption: existingRedemption,
          coupon,
        };

        return;
      }

      // 4. Gate 1: Atomically check and increment global usage
      const updatedCoupon = await Coupon.findOneAndUpdate(
        {
          _id: coupon._id,
          usedCount: { $lt: coupon.maxUses },
        },
        {
          $inc: { usedCount: 1 },
        },
        {
          new: true,
          session,
        }
      );

      if (!updatedCoupon) {
        throw new AppError(
          "Coupon usage limit reached",
          400
        );
      }

      // 5. Gate 2: Check per-user usage limit
      const userRedemptionCount =
        await Redemption.countDocuments({
          couponId: coupon._id,
          userId,
          status: "APPLIED",
        }).session(session);

      if (userRedemptionCount >= coupon.perUserLimit) {
        throw new AppError(
          "You have reached the coupon usage limit",
          400
        );
      }

      // 6. Create redemption
      const createdRedemption = await Redemption.create(
        [
          {
            couponId: coupon._id,
            userId,
            orderId,
            orderAmount,
            ...amounts,
            status: "APPLIED",
          },
        ],
        { session }
      );

      result = {
        redemption: createdRedemption[0],
        coupon: updatedCoupon,
      };
    });

    return result;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return await resolveDuplicateRedemption(coupon, userId, orderId);
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

// Get customer's redemption history
export const getMyRedemptions = async (userId) => {
  const redemptions = await Redemption.find({
    userId,
  })
    .populate("couponId")
    .sort("-createdAt");

  return redemptions;
};
// Get all redemptions (admin) — supports the same filter/sort/paginate query params as coupons
export const getAllRedemptions = async (query) => {
  const features = new APIFeatures(
    Redemption.find().populate("couponId").populate("userId", "name email"),
    query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const redemptions = await features.query;

  return redemptions;
};
// Revert redemption
export const revertRedemption = async (redemptionId) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // Find the redemption
      const redemption = await Redemption.findById(
        redemptionId
      ).session(session);

      if (!redemption) {
        throw new AppError("Redemption not found", 404);
      }

      if (redemption.status === "REVERTED") {
        throw new AppError("Redemption already reverted", 400);
      }

      // Atomically decrement coupon usage
      const coupon = await Coupon.findOneAndUpdate(
        {
          _id: redemption.couponId,
          usedCount: { $gt: 0 },
        },
        {
          $inc: { usedCount: -1 },
        },
        {
          new: true,
          session,
        }
      );

      if (!coupon) {
        throw new AppError(
          "Coupon usage count cannot be decremented",
          400
        );
      }

      // Mark redemption as reverted
      const updatedRedemption =
        await Redemption.findOneAndUpdate(
          {
            _id: redemptionId,
            status: "APPLIED",
          },
          {
            status: "REVERTED",
          },
          {
            new: true,
            session,
          }
        );

      if (!updatedRedemption) {
        throw new AppError(
          "Redemption could not be reverted",
          400
        );
      }

      result = {
        redemption: updatedRedemption,
        coupon,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
};
