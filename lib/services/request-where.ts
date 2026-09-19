import type { Prisma } from "@prisma/client";
import type { RequestQuery } from "@/lib/validations/request-query";

export function buildRequestWhere(query: RequestQuery): Prisma.ServiceRequestWhereInput {
  const and: Prisma.ServiceRequestWhereInput[] = [];

  if (query.status) and.push({ status: query.status });
  if (query.priority) and.push({ priority: query.priority });
  if (query.categoryId) and.push({ categoryId: query.categoryId });
  if (query.assigneeId === "unassigned") and.push({ assigneeId: null });
  else if (query.assigneeId) and.push({ assigneeId: query.assigneeId });
  if (query.search) {
    and.push({
      OR: [
        { title: { contains: query.search } },
        { requester: { name: { contains: query.search } } },
      ],
    });
  }

  return and.length ? { AND: and } : {};
}
