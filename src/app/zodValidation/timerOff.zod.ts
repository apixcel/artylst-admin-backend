import { z } from "zod";

const create = z
  .object({
    startTime: z.coerce.date({
      required_error: "startTime is required",
      invalid_type_error: "startTime must be a date or date-like string",
    }),
    endTime: z.coerce.date({
      required_error: "endTime is required",
      invalid_type_error: "endTime must be a date or date-like string",
    }),
  })
  .refine((v) => v.endTime.getTime() > v.startTime.getTime(), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

const TimerOffValidation = {
  create,
};

export default TimerOffValidation;
