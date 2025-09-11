import { z } from "zod";

export const pricingTierSchema = z.object({
  name: z.string({ required_error: "name is required" }),

  songs: z
    .number({ required_error: "songs is required" })
    .int("songs must be an integer")
    .positive("songs must be greater than 0"),

  priceUsd: z
    .number({ required_error: "priceUsd is required" })
    .nonnegative("priceUsd must be >= 0"),

  deliveryTime: z.string().min(1, "deliveryTime is required"),

  description: z.array(z.string().min(1), {
    message: "description is required and must not be empty",
  }),
  order: z
    .number({ message: "order is should be a number" })
    .int("order must be an integer")
    .min(1, "order must be greater than 0")
    .optional(),
  revisionCount: z
    .number({ required_error: "revisionCount is required" })
    .int("revisionCount must be an integer")
    .nonnegative("revisionCount must be >= 0"),
});

const pricingZod = {
  create: pricingTierSchema,
  update: pricingTierSchema.partial(),
};

export default pricingZod;
