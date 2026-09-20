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

/**
 * Single-pass O(n) summary. Never throws.
 *
 * - `skipped`: malformed/incomplete records (missing ids, bad dates, unknown types)
 * - `ignored`: valid but irrelevant (CREATED, non-RESOLVED status, extra resolves
 *   with no open assignment)
 *
 * Precondition: activities for the same requestId must already be in chronological
 * `createdAt` order. Pairing follows array order. This function does not sort.
 *
 * Unassign (`ASSIGNEE_CHANGED` with empty assigneeId) clears the open assignment
 * so a later resolve is not credited to the previous assignee. A resolve closes
 * the open assignment; a later resolve on the same request counts only after a
 * new assign (so reopen + resolve cannot inflate totals).
 */
export function summarizeActivities(activities: unknown): SummarizeResult {
  if (!Array.isArray(activities)) {
    return { byAssignee: [], skipped: 0, ignored: 0 };
  }

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

  for (const item of activities) {
    if (!item || typeof item !== "object") {
      skipped += 1;
      continue;
    }

    const record = item as ActivityInput;
    const requestId = record.requestId;
    const type = record.type;
    const createdAt = parseDate(record.createdAt);

    if (!isNonEmptyString(requestId) || !isNonEmptyString(type) || !createdAt) {
      skipped += 1;
      continue;
    }

    if (type === "CREATED") {
      ignored += 1;
      continue;
    }

    if (type === "ASSIGNEE_CHANGED") {
      const assigneeId = record.assigneeId;
      if (!isNonEmptyString(assigneeId)) {
        requestState.delete(requestId);
        continue;
      }
      bucket(assigneeId).assigned += 1;
      requestState.set(requestId, { assigneeId, assignedAt: createdAt.getTime() });
      resolvedWithoutOpen.delete(requestId);
      continue;
    }

    if (type === "STATUS_CHANGED") {
      if (record.toValue !== "RESOLVED") {
        ignored += 1;
        continue;
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
        continue;
      }

      if (isNonEmptyString(record.assigneeId) && !resolvedWithoutOpen.has(requestId)) {
        bucket(record.assigneeId).resolved += 1;
        resolvedWithoutOpen.add(requestId);
        continue;
      }

      ignored += 1;
      continue;
    }

    skipped += 1;
  }

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
