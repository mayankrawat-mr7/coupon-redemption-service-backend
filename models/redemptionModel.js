import mongoose from "mongoose";

const { Schema, model } = mongoose;

const redemptionSchema = new Schema(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: [true, "Coupon ID is required"],
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    orderId: {
      type: String,
      required: [true, "Order ID is required"],
      trim: true,
    },

    orderAmount: {
      type: Number,
      required: [true, "Order amount is required"],
      min: [0, "Order amount cannot be negative"],
    },

    discountAmount: {
      type: Number,
      required: [true, "Discount amount is required"],
      min: [0, "Discount amount cannot be negative"],
    },

    finalAmount: {
      type: Number,
      required: [true, "Final amount is required"],
      min: [0, "Final amount cannot be negative"],
    },

    status: {
      type: String,
      enum: ["APPLIED", "REVERTED"],
      default: "APPLIED",
    },
  },
  {
    timestamps: true,
  }
);

redemptionSchema.index(
  { couponId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "APPLIED",
    },
  }
);

redemptionSchema.index(
  { couponId: 1, userId: 1, orderId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "APPLIED",
    },
  }
);

const Redemption = model("Redemption", redemptionSchema);

export default Redemption;
