import mongoose from "mongoose";

const { Schema, model } = mongoose;

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    discountType: {
      type: String,
      enum: ["PERCENT", "FLAT"],
      required: [true, "Discount type is required"],
    },

    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },

    maxUses: {
      type: Number,
      required: [true, "Maximum uses is required"],
      min: [1, "Maximum uses must be at least 1"],
    },

    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Used count cannot be negative"],
    },

    perUserLimit: {
      type: Number,
      required: [true, "Per-user limit is required"],
      min: [1, "Per-user limit must be at least 1"],
    },

    startsAt: {
      type: Date,
      required: [true, "Start date is required"],
    },

    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
    },

  },
  {
    timestamps: true,
  }
);

// couponSchema.index({ code: 1 });
couponSchema.index({ expiresAt: 1 });

const Coupon = model("Coupon", couponSchema);

export default Coupon;
