export const SESSION_COOKIE = "asf_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const FETCH_TIMEOUT_MS = 10_000;
export const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export const STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

// Enum text sorts alphabetically in SQLite, so ranked sorting uses these columns.
export const STATUS_RANK: Record<Status, number> = {
  PENDING: 1,
  IN_PROGRESS: 2,
  RESOLVED: 3,
  CLOSED: 4,
};

export const PRIORITY_RANK: Record<Priority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

export const SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "priority",
  "status",
  "number",
] as const;

export const SORT_COLUMNS: Record<SortField, "priorityRank" | "statusRank" | "createdAt" | "number" | "updatedAt"> = {
  createdAt: "createdAt",
  number: "number",
  priority: "priorityRank",
  status: "statusRank",
  updatedAt: "updatedAt",
};

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type SortField = (typeof SORT_FIELDS)[number];
