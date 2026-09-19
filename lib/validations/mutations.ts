import { z } from "zod";
import { STATUSES } from "@/lib/constants";

export const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
});

export const updateAssigneeSchema = z.object({
  assigneeId: z.string().min(1).nullable(),
});
