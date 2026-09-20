import { describe, expect, it } from "vitest";
import { updateAssigneeSchema, updateStatusSchema } from "@/lib/validations/mutations";

const iso = new Date("2026-01-01T00:00:00.000Z").toISOString();

describe("mutation schemas", () => {
  it("accepts a valid ISO updatedAt and omitted updatedAt", () => {
    expect(updateStatusSchema.parse({ status: "PENDING", updatedAt: iso }).updatedAt).toBe(iso);
    expect(updateStatusSchema.parse({ status: "PENDING" }).updatedAt).toBeUndefined();
    expect(updateAssigneeSchema.parse({ assigneeId: "u1", updatedAt: iso }).updatedAt).toBe(iso);
    expect(updateAssigneeSchema.parse({ assigneeId: null }).updatedAt).toBeUndefined();
  });

  it("rejects garbage and empty updatedAt", () => {
    expect(() => updateStatusSchema.parse({ status: "PENDING", updatedAt: "garbage" })).toThrow();
    expect(() => updateStatusSchema.parse({ status: "PENDING", updatedAt: "" })).toThrow();
    expect(() => updateAssigneeSchema.parse({ assigneeId: "u1", updatedAt: "garbage" })).toThrow();
    expect(() => updateAssigneeSchema.parse({ assigneeId: "u1", updatedAt: "" })).toThrow();
  });
});
