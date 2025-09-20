import { z } from "zod";

/** Mongo ObjectId as a 24-hex string */
export const zObjectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");

export const zAudienceType = z.enum(["fan", "artist", "admin", "business"]);

const createBroadcastNotification = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().min(1, "description is required"),
  audienceType: z.array(zAudienceType).min(1, "audienceType is required"),
});

const notificationValidation = {
  createBroadcastNotification,
};

export default notificationValidation;
