import { z } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PRIORITIES,
  SORT_FIELDS,
  STATUSES,
} from "@/lib/constants";

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export const requestQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: z.enum(STATUSES).optional().catch(undefined),
  priority: z.enum(PRIORITIES).optional().catch(undefined),
  categoryId: z.string().min(1).optional().catch(undefined),
  assigneeId: z.string().min(1).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sort: z.enum(SORT_FIELDS).catch("updatedAt").default("updatedAt"),
  order: z.enum(["asc", "desc"]).catch("desc").default("desc"),
});

export type RequestQuery = z.infer<typeof requestQuerySchema>;

export function parseRequestQuery(
  raw: Record<string, string | string[] | undefined>,
): RequestQuery {
  return requestQuerySchema.parse({
    search: first(raw.search) ?? "",
    status: first(raw.status) || undefined,
    priority: first(raw.priority) || undefined,
    categoryId: first(raw.categoryId) || undefined,
    assigneeId: first(raw.assigneeId) || undefined,
    page: first(raw.page),
    limit: first(raw.limit),
    sort: first(raw.sort),
    order: first(raw.order),
  });
}

export function requestQueryToSearchParams(query: Partial<RequestQuery>): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.priority) params.set("priority", query.priority);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.assigneeId) params.set("assigneeId", query.assigneeId);
  if (query.page && query.page !== 1) params.set("page", String(query.page));
  if (query.limit && query.limit !== DEFAULT_PAGE_SIZE) params.set("limit", String(query.limit));
  if (query.sort && query.sort !== "updatedAt") params.set("sort", query.sort);
  if (query.order && query.order !== "desc") params.set("order", query.order);
  return params;
}
