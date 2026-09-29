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

  orderAmount: Joi.number().positive().precision(2).required().messages({
    "number.base": "Order amount must be a number",
    "number.positive": "Order amount must be greater than zero",
    "number.precision": "Order amount can have at most 2 decimal places",
    "any.required": "Order amount is required",
  }),
});
