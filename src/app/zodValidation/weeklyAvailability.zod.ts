import { z } from "zod";

/** HH:mm (24h) */
const hhmmRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const TimeString = z.string().regex(hhmmRegex, 'Time must be in "HH:mm" 24h format');
const TimeOrNull = TimeString.nullable();

const DayScheduleZ = z
  .object({
    day: z.number().int().min(0).max(6), // 0=Sun ... 6=Sat
    acceptOrders: z.boolean().default(false),
    startTime: TimeOrNull.optional().default(null),
    endTime: TimeOrNull.optional().default(null),
  })
  .superRefine((val, ctx) => {
    // If accepting orders, both times must be present and start < end
    if (val.acceptOrders) {
      if (val.startTime == null || val.endTime == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "startTime and endTime are required when acceptOrders is true.",
          path: ["startTime"], // arbitrary; shows where the error is
        });
        return;
      }
      const toMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      if (toMinutes(val.startTime) >= toMinutes(val.endTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "startTime must be earlier than endTime.",
          path: ["startTime"],
        });
      }
    }
  });

const alter = z.object({
  schedule: z
    .array(DayScheduleZ)
    .length(7, "Weekly schedule must include exactly 7 days.")
    .superRefine((arr, ctx) => {
      const days = arr.map((d) => d.day);
      const uniq = new Set(days);
      if (uniq.size !== 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each day (0–6) must appear exactly once.",
          path: ["schedule"],
        });
      }
      // ensure all days 0..6 exist
      for (let d = 0; d <= 6; d++) {
        if (!uniq.has(d)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Missing day ${d} in schedule.`,
            path: ["schedule"],
          });
        }
      }
    }),
});

const weeklyAvailabilityValidations = {
  alter,
};

export default weeklyAvailabilityValidations;
