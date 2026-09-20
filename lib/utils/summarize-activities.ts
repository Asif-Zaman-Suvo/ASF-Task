export type ActivityInput = {
  requestId?: unknown;
  assigneeId?: unknown;
  type?: unknown;
  createdAt?: unknown;
  toValue?: unknown;
};

export type AssigneeActivitySummary = {
  assigneeId: string;
  totalAssigned: number;
  totalResolved: number;
  averageResolutionTimeMs: number | null;
};

export type SummarizeResult = {
  byAssignee: AssigneeActivitySummary[];
  skipped: number;
  ignored: number;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? value : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

type AssigneeBucket = {
  assigned: number;
  resolved: number;
  durationSum: number;
  durationCount: number;
};

function emptyResult(): SummarizeResult {
  return { byAssignee: [], skipped: 0, ignored: 0 };
}

/**
 * Incremental O(n) summarizer. Call `add` per record, then `finish`.
 * Same semantics as `summarizeActivities`. Never throws.
 *
 * - `skipped`: malformed/incomplete (missing ids, bad dates, unknown types, missing assigneeId key)
 * - `ignored`: CREATED, non-RESOLVED status, explicit unassign (`assigneeId: null`), extra resolve
 *
 * Precondition: records for the same requestId must be added in chronological order.
 */
export function createActivitySummarizer() {
  const byAssignee = new Map<string, AssigneeBucket>();
  const requestState = new Map<string, { assigneeId: string; assignedAt: number }>();
  const resolvedWithoutOpen = new Set<string>();
  let skipped = 0;
  let ignored = 0;

  const bucket = (assigneeId: string): AssigneeBucket => {
    const existing = byAssignee.get(assigneeId);
    if (existing) return existing;
    const created: AssigneeBucket = {
      assigned: 0,
      resolved: 0,
      durationSum: 0,
      durationCount: 0,
    };
    byAssignee.set(assigneeId, created);
    return created;
  };

  function add(item: unknown) {
    if (!item || typeof item !== "object") {
      skipped += 1;
      return;
    }

    const record = item as ActivityInput;
    const requestId = record.requestId;
    const type = record.type;
    const createdAt = parseDate(record.createdAt);

    if (!isNonEmptyString(requestId) || !isNonEmptyString(type) || !createdAt) {
      skipped += 1;
      return;
    }

    if (type === "CREATED") {
      ignored += 1;
      return;
    }

    if (type === "ASSIGNEE_CHANGED") {
      if (!Object.hasOwn(record, "assigneeId")) {
        skipped += 1;
        return;
      }
      const assigneeId = record.assigneeId;
      if (assigneeId === null) {
        requestState.delete(requestId);
        ignored += 1;
        return;
      }
      if (!isNonEmptyString(assigneeId)) {
        skipped += 1;
        return;
      }
      bucket(assigneeId).assigned += 1;
      requestState.set(requestId, { assigneeId, assignedAt: createdAt.getTime() });
      resolvedWithoutOpen.delete(requestId);
      return;
    }

    if (type === "STATUS_CHANGED") {
      if (record.toValue !== "RESOLVED") {
        ignored += 1;
        return;
      }

      const current = requestState.get(requestId);
      if (current) {
        const stats = bucket(current.assigneeId);
        stats.resolved += 1;
        const delta = createdAt.getTime() - current.assignedAt;
        if (delta >= 0) {
          stats.durationSum += delta;
          stats.durationCount += 1;
        }
        requestState.delete(requestId);
        resolvedWithoutOpen.add(requestId);
        return;
      }

      if (isNonEmptyString(record.assigneeId) && !resolvedWithoutOpen.has(requestId)) {
        bucket(record.assigneeId).resolved += 1;
        resolvedWithoutOpen.add(requestId);
        return;
      }

      ignored += 1;
      return;
    }

    skipped += 1;
  }

  function finish(): SummarizeResult {
    return {
      byAssignee: Array.from(byAssignee, ([assigneeId, stats]) => ({
        assigneeId,
        totalAssigned: stats.assigned,
        totalResolved: stats.resolved,
        averageResolutionTimeMs: stats.durationCount
          ? stats.durationSum / stats.durationCount
          : null,
      })),
      skipped,
      ignored,
    };
  }

  return { add, finish };
}

export function summarizeActivities(activities: unknown): SummarizeResult {
  if (!Array.isArray(activities)) return emptyResult();
  const summarizer = createActivitySummarizer();
  for (const item of activities) summarizer.add(item);
  return summarizer.finish();
}
