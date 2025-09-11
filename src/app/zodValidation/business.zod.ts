import { z } from "zod";
import { objectIdRegex } from "../utils";

const updateProfile = z.object({
  fullName: z.string().min(1, "Full name is required").optional(),
  businessName: z.string().min(1, "Business name is required").optional(),
  email: z.string().email("Invalid email address").optional(),

  genre: z.string().regex(objectIdRegex, "Invalid genre id").optional(),
  vibe: z.string().regex(objectIdRegex, "Invalid vibe id").optional(),

  businessType: z.string().min(1, "Business type is required").optional(),

  desirePlaylistLengthMinute: z
    .number()
    .int()
    .min(1, "Playlist length must be at least 1 minute")
    .optional(),

  desirePriceUsd: z.number().min(0, "Price must be non-negative").optional(),

  useCase: z
    .enum(["daily", "special-occasion"], {
      required_error: "Use case is required",
    })
    .optional(),
});

const businessValidation = {
  updateProfile,
};

export default businessValidation;
