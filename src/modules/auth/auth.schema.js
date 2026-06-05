import Joi from "joi";
import j2s from "joi-to-swagger";

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const { swagger: loginSwaggerSchema } = j2s(loginSchema);

export const signupSchema = Joi.object({
  full_name: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const { swagger: signupSwaggerSchema } = j2s(signupSchema);
