import Joi from "joi";

export const redeemCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().required().messages({
    "string.empty": "Coupon code is required",
    "any.required": "Coupon code is required",
  }),

  orderId: Joi.string().trim().required().messages({
    "string.empty": "Order ID is required",
    "any.required": "Order ID is required",
  }),
});