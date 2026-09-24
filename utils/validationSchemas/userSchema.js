import Joi from "joi";

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const createUserSchema = Joi.object({
  name: Joi.string().required(),

  email: Joi.string().email().required(),

  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .messages({
      "string.pattern.base": "Phone number must be 10 digits",
    })
    .required(),

  password: Joi.string().min(6).required(),

  role: Joi.string().valid("admin", "customer").default("customer"),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().optional(),

  email: Joi.string().email().optional(),

  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .messages({
      "string.pattern.base": "Phone number must be 10 digits",
    })
    .optional(),

  password: Joi.string().min(6).optional(),

  role: Joi.string().valid("admin", "customer").optional(),
});