import { z } from "zod";
import { STATUSES } from "@/lib/constants";

export const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
  updatedAt: z.iso.datetime().optional(),
});

export const updateAssigneeSchema = z.object({
  assigneeId: z.string().min(1).nullable(),
  updatedAt: z.iso.datetime().optional(),
});
