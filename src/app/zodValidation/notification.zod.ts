import { z } from "zod";

/** Mongo ObjectId as a 24-hex string */
export const zObjectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");

export const zAudienceType = z.enum(["fan", "artist", "admin", "business"]);

export const zNotificationCreate = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().min(1, "description is required"),
  audienceType: zAudienceType.nullable().optional().default(null),
  isReaded: z.boolean().optional().default(false),
  auth: zObjectId.optional(),
});
