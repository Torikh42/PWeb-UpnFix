import Joi from "joi";
import j2s from "joi-to-swagger";

export const updateStatusSchema = Joi.object({
  status: Joi.string().valid("PENDING", "DIPROSES", "SELESAI").required(),
  admin_notes: Joi.string().allow("").optional(),
});

export const { swagger: updateStatusSwaggerSchema } = j2s(updateStatusSchema);
