import { describe, expect, it } from "vitest";
import {
  createActivitySummarizer,
  summarizeActivities,
} from "@/lib/utils/summarize-activities";

describe("summarizeActivities", () => {
  it("returns empty result for non-arrays", () => {
    expect(summarizeActivities(null)).toEqual({ byAssignee: [], skipped: 0, ignored: 0 });
    expect(summarizeActivities(undefined)).toEqual({ byAssignee: [], skipped: 0, ignored: 0 });
  });

  it("skips malformed records and ignores irrelevant valid events", () => {
    const result = summarizeActivities([
      null,
      "bad",
      {},
      { requestId: "r1", type: "ASSIGNEE_CHANGED", assigneeId: "a1", createdAt: "not-a-date" },
      { requestId: "", type: "ASSIGNEE_CHANGED", assigneeId: "a1", createdAt: "2026-01-01" },
      { requestId: "r1", type: "CREATED", assigneeId: "a1", createdAt: "2026-01-01T00:00:00.000Z" },
      { requestId: "r1", type: "STATUS_CHANGED", toValue: "PENDING", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    expect(result.byAssignee).toEqual([]);
    expect(result.skipped).toBe(5);
    expect(result.ignored).toBe(2);
  });

  it("computes assigned, resolved, and average resolution time in O(n)", () => {
    const result = summarizeActivities([
      {
        requestId: "r1",
        type: "ASSIGNEE_CHANGED",
        assigneeId: "a1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        requestId: "r1",
        type: "STATUS_CHANGED",
        toValue: "RESOLVED",
        createdAt: "2026-01-01T02:00:00.000Z",
      },
      {
        requestId: "r2",
        type: "ASSIGNEE_CHANGED",
        assigneeId: "a1",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      {
        requestId: "r2",
        type: "STATUS_CHANGED",
        toValue: "RESOLVED",
        createdAt: "2026-01-02T04:00:00.000Z",
      },
    ]);

    expect(result.skipped).toBe(0);
    expect(result.ignored).toBe(0);
    expect(result.byAssignee).toEqual([
      {
        assigneeId: "a1",
        totalAssigned: 2,
        totalResolved: 2,
        averageResolutionTimeMs: 3 * 60 * 60 * 1000,
      },
    ]);
  });

  it("counts resolved without duration when assign is missing, using fallback assigneeId", () => {
    const result = summarizeActivities([
      {
        requestId: "r1",
        type: "STATUS_CHANGED",
        toValue: "RESOLVED",
        assigneeId: "a2",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    expect(result.byAssignee).toEqual([
      {
        assigneeId: "a2",
        totalAssigned: 0,
        totalResolved: 1,
        averageResolutionTimeMs: null,
      },
    ]);
  });

  it("ignores negative intervals for the average but still counts resolved", () => {
    const result = summarizeActivities([
      {
        requestId: "r1",
        type: "ASSIGNEE_CHANGED",
        assigneeId: "a1",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
      {
        requestId: "r1",
        type: "STATUS_CHANGED",
        toValue: "RESOLVED",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    expect(result.byAssignee[0]).toMatchObject({
      totalAssigned: 1,
      totalResolved: 1,
      averageResolutionTimeMs: null,
    });
  });

  it("does not credit a resolve after unassign", () => {
    const result = summarizeActivities([
      {
        requestId: "r1",
        type: "ASSIGNEE_CHANGED",
        assigneeId: "a1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        requestId: "r1",
        type: "ASSIGNEE_CHANGED",
        assigneeId: null,
        createdAt: "2026-01-01T01:00:00.000Z",
      },
      {
        requestId: "r1",
        type: "STATUS_CHANGED",
        toValue: "RESOLVED",
        createdAt: "2026-01-01T02:00:00.000Z",
      },
    ]);

    expect(result.byAssignee).toEqual([
      {
        assigneeId: "a1",
        totalAssigned: 1,
        totalResolved: 0,
        averageResolutionTimeMs: null,
      },
    ]);
    expect(result.ignored).toBe(2);
  });

  it("skips ASSIGNEE_CHANGED with a missing assigneeId key and keeps pairing", () => {
    const result = summarizeActivities([
      {
        requestId: "r1",
        type: "ASSIGNEE_CHANGED",
        assigneeId: "a1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        requestId: "r1",
        type: "ASSIGNEE_CHANGED",
        createdAt: "2026-01-01T01:00:00.000Z",
      },
      {
        requestId: "r1",
        type: "STATUS_CHANGED",
        toValue: "RESOLVED",
        createdAt: "2026-01-01T02:00:00.000Z",
      },
    ]);

    expect(result.skipped).toBe(1);
    expect(result.byAssignee).toEqual([
      {
        assigneeId: "a1",
        totalAssigned: 1,
        totalResolved: 1,
        averageResolutionTimeMs: 2 * 60 * 60 * 1000,
      },
    ]);
  });

  it("does not count a second resolve after reopen without a new assign", () => {
    const result = summarizeActivities([
      {
        requestId: "r1",
        type: "ASSIGNEE_CHANGED",
        assigneeId: "a1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        requestId: "r1",
        type: "STATUS_CHANGED",
        toValue: "RESOLVED",
        assigneeId: "a1",
        createdAt: "2026-01-01T02:00:00.000Z",
      },
      {
        requestId: "r1",
        type: "STATUS_CHANGED",
        toValue: "PENDING",
        createdAt: "2026-01-01T03:00:00.000Z",
      },
      {
        requestId: "r1",
        type: "STATUS_CHANGED",
        toValue: "RESOLVED",
        assigneeId: "a1",
        createdAt: "2026-01-01T04:00:00.000Z",
      },
    ]);

    expect(result.byAssignee).toEqual([
      {
        assigneeId: "a1",
        totalAssigned: 1,
        totalResolved: 1,
        averageResolutionTimeMs: 2 * 60 * 60 * 1000,
      },
    ]);
    expect(result.ignored).toBe(2);
  });

  it("handles a large mixed dataset without crashing", () => {
    const activities = Array.from({ length: 12_000 }, (_, index) => {
      if (index % 7 === 0) return { garbage: true };
      if (index % 3 === 0) {
        return {
          requestId: `r${index % 400}`,
          type: "ASSIGNEE_CHANGED",
          assigneeId: `a${index % 8}`,
          createdAt: Date.UTC(2026, 0, 1) + index * 1000,
        };
      }
      return {
        requestId: `r${index % 400}`,
        type: "STATUS_CHANGED",
        toValue: index % 2 === 0 ? "RESOLVED" : "PENDING",
        createdAt: Date.UTC(2026, 0, 1) + index * 1000 + 500,
      };
    });

    const result = summarizeActivities(activities);
    expect(result.skipped).toBeGreaterThan(0);
    expect(result.ignored).toBeGreaterThan(0);
    expect(result.byAssignee.length).toBeGreaterThan(0);
    for (const row of result.byAssignee) {
      expect(row.totalAssigned).toBeGreaterThanOrEqual(0);
      expect(row.totalResolved).toBeGreaterThanOrEqual(0);
    }
  });

  it("matches summarizeActivities when records are added in cursor batches", () => {
    const records = [
      {
        requestId: "r1",
        type: "ASSIGNEE_CHANGED",
        assigneeId: "a1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        requestId: "r1",
        type: "STATUS_CHANGED",
        toValue: "RESOLVED",
        createdAt: "2026-01-01T02:00:00.000Z",
      },
      {
        requestId: "r2",
        type: "ASSIGNEE_CHANGED",
        assigneeId: "a2",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ];

    const summarizer = createActivitySummarizer();
    summarizer.add(records[0]);
    summarizer.add(records[1]);
    summarizer.add(records[2]);

    expect(summarizer.finish()).toEqual(summarizeActivities(records));
  });
});
