import { z } from "zod";
import { STEAMING_PLATFORMS } from "../constants/StreamingConnection.constant";
import { objectIdRegex } from "../utils";

const businessOrder = z.object({
  artist: z.string().regex(objectIdRegex, "Invalid artist id"),
  platform: z.enum(STEAMING_PLATFORMS),
  deliveryWindow: z.string().optional(),
  note: z.string().optional(),
  deliveryInfo: z.object({
    email: z.string().email(),
    name: z.string().min(1, "Name is required"),
  }),
  addOn: z
    .object({
      label: z.string(),
      price: z.number().min(0),
    })
    .optional(),
  tierId: z.string().regex(objectIdRegex, "Invalid tier id"),
});

const orderValidaton = {
  businessOrder,
};

export default orderValidaton;
