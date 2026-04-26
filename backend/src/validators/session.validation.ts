import { z } from "zod";

export const bookSessionSchema = z.object({
  body: z.object({
    therapistId: z.string().uuid("Invalid therapist ID"),
    slotId: z.string().uuid("Invalid slot ID"),
    type: z.enum(["VIDEO", "VOICE", "CHAT"]),
  }),
});

export const sessionIdParamSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid("Invalid session ID"),
  }),
});

export const cancelSessionSchema = z.object({
  body: z.object({
    reason: z.string().min(5, "Please provide a cancellation reason").max(500),
  }),
});

export const rescheduleSessionSchema = z.object({
  body: z.object({
    newScheduledAt: z.string().datetime("Invalid date format — use ISO 8601"),
  }),
});

export const sessionNotesSchema = z.object({
  body: z.object({
    notes: z.string().min(1, "Notes cannot be empty").max(10000),
  }),
});

export const sessionHistoryQuerySchema = z.object({
  query: z.object({
    status: z
      .enum(["PENDING", "CONFIRMED", "ONGOING", "COMPLETED", "CANCELLED", "RESCHEDULED"])
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Message cannot be empty").max(5000),
  }),
});

export const chatHistoryQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
});
