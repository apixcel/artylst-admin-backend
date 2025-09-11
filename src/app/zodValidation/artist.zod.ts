import z from "zod";
import { AUTH_GENDERS } from "../constants/auth.constant";
import { objectIdRegex } from "../utils";

const updateInfo = z
  .object({
    fullName: z.string().min(1, { message: "Full name is required" }).optional(),
    gender: z.enum(AUTH_GENDERS, {
      required_error: "Gender is required",
    }),
    displayName: z.string().min(1, { message: "Display name is required" }).optional(),
    dob: z.coerce.date({
      required_error: "Date of birth is required",
      invalid_type_error: "Invalid date format",
    }),
    avatar: z.string().nullable().optional(),
    coverPhoto: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    genre: z.array(
      z.string().regex(objectIdRegex, {
        message: "Invalid genre id",
      })
    ),
    country: z.string().nullable().optional(),
  })
  .partial();

export const artistValidation = {
  updateInfo,
};
