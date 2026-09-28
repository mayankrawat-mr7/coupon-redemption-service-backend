import Joi from "joi";

export const createCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().required().messages({
    "string.empty": "Coupon code is required",
    "any.required": "Coupon code is required",
  }),

  discountType: Joi.string()
    .valid("PERCENT", "FLAT")
    .required()
    .messages({
      "any.only": "Discount type must be PERCENT or FLAT",
      "any.required": "Discount type is required",
    }),

  discountValue: Joi.number().min(0).required().messages({
    "number.min": "Discount value cannot be negative",
    "any.required": "Discount value is required",
  }),

  maxUses: Joi.number().integer().min(1).required().messages({
    "number.min": "Maximum uses must be at least 1",
    "any.required": "Maximum uses is required",
  }),

  perUserLimit: Joi.number().integer().min(1).required().messages({
    "number.min": "Per-user limit must be at least 1",
    "any.required": "Per-user limit is required",
  }),

  startsAt: Joi.date().required().messages({
    "date.base": "Start date must be a valid date",
    "any.required": "Start date is required",
  }),

  expiresAt: Joi.date().required().messages({
    "date.base": "Expiry date must be a valid date",
    "any.required": "Expiry date is required",
  }),

});

export const updateCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase(),

  discountType: Joi.string().valid("PERCENT", "FLAT"),

  discountValue: Joi.number().min(0),

  maxUses: Joi.number().integer().min(1),

  perUserLimit: Joi.number().integer().min(1),

  startsAt: Joi.date(),

  expiresAt: Joi.date(),

}).min(1);
