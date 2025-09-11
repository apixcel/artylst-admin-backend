import { z } from "zod";
import { STEAMING_PLATFORMS } from "../constants/StreamingConnection.constant";

// Accept a valid URL, or null/"" to clear it.
// "" is transformed to null so your update code can $set to null.
const urlOrNull = z
  .union([z.string().url("Invalid URL"), z.literal(""), z.null()])
  .transform((v) => (v === "" ? null : v));

const alter = z
  .object({
    spotify: urlOrNull.optional(),
    appleMusic: urlOrNull.optional(),
    youtubeMusic: urlOrNull.optional(),
    soundcloud: urlOrNull.optional(),
    defaultPlatform: z
      .enum([...STEAMING_PLATFORMS, ""])
      .nullable()
      .optional(),
  })
  .superRefine((val, ctx) => {
    // If defaultPlatform is provided, require that platform's link to be present (non-null)
    if (val.defaultPlatform) {
      const link = val[val.defaultPlatform];
      // Note: link may be undefined if not included in this payload.
      // In that case, we can't guarantee it's set in DB; enforce presence now.
      if (link == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["defaultPlatform"],
          message: `defaultPlatform '${val.defaultPlatform}' requires a non-empty ${val.defaultPlatform} link in this request.`,
        });
      }
    }
  });

const streamingConnectionValidation = {
  alter,
};

export default streamingConnectionValidation;
