import { cache } from "react";
import type { Prisma, ServiceRequest } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { cachedQuery, CACHE_TAGS, revalidateWorkload } from "@/lib/cache-tags";
import { formatRequestNumber } from "@/lib/format";
import { SORT_COLUMNS, STATUS_RANK } from "@/lib/constants";
import type { RequestQuery } from "@/lib/validations/request-query";
import { buildRequestWhere } from "@/lib/services/request-where";
import { createActivitySummarizer } from "@/lib/utils/summarize-activities";
import { listAssignees } from "@/lib/services/users";
import type { AssigneeActivitySummary } from "@/lib/utils/summarize-activities";
import type {
  ActivityItem,
  ListRequestsResult,
  RequestDetail,
  RequestListItem,
} from "@/lib/types/request";

export { buildRequestWhere };

const listSelect = {
  id: true,
  number: true,
  title: true,
  priority: true,
  status: true,
  updatedAt: true,
  requester: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} as const;

const detailInclude = {
  requester: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  activities: {
    orderBy: { createdAt: "asc" as const },
    include: { actor: { select: { id: true, name: true } } },
  },
};

function toListItem(row: {
  id: string;
  number: number;
  title: string;
  priority: RequestListItem["priority"];
  status: RequestListItem["status"];
  updatedAt: Date;
  requester: { id: string; name: string };
  category: { id: string; name: string };
  assignee: { id: string; name: string } | null;
}): RequestListItem {
  return {
    id: row.id,
    number: row.number,
    displayId: formatRequestNumber(row.number),
    title: row.title,
    requester: row.requester,
    category: row.category,
    priority: row.priority,
    status: row.status,
    assignee: row.assignee,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toActivity(row: {
  id: string;
  type: ActivityItem["type"];
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
  actor: { id: string; name: string };
  assigneeId: string | null;
  requestId: string;
}): ActivityItem {
  return {
    id: row.id,
    type: row.type,
    fromValue: row.fromValue,
    toValue: row.toValue,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor,
    assigneeId: row.assigneeId,
    requestId: row.requestId,
  };
}

function toDetail(row: {
  id: string;
  number: number;
  title: string;
  description: string;
  priority: RequestListItem["priority"];
  status: RequestListItem["status"];
  createdAt: Date;
  updatedAt: Date;
  requester: { id: string; name: string };
  category: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  activities: Parameters<typeof toActivity>[0][];
}): RequestDetail {
  return {
    ...toListItem(row),
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    activities: row.activities.map(toActivity),
  };
}

export async function listRequests(query: RequestQuery): Promise<ListRequestsResult> {
  const where = buildRequestWhere(query);
  const skip = (query.page - 1) * query.limit;

  const sortColumn = SORT_COLUMNS[query.sort];
  const orderBy: Prisma.ServiceRequestOrderByWithRelationInput[] = [
    { [sortColumn]: query.order },
    { number: "asc" },
  ];

  const [rows, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
      select: listSelect,
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  return {
    data: rows.map(toListItem),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export const getRequestById = cache(async (id: string): Promise<RequestDetail | null> => {
  const row = await prisma.serviceRequest.findUnique({
    where: { id },
    include: detailInclude,
  });
  if (!row) return null;
  return toDetail(row);
});

function assertFresh(currentUpdatedAt: Date, expectedUpdatedAt?: string) {
  if (!expectedUpdatedAt) return;
  if (currentUpdatedAt.toISOString() !== expectedUpdatedAt) {
    throw new AppError("CONFLICT", "Request was updated by someone else", 409);
  }
}

export async function updateRequestStatus(
  id: string,
  status: ServiceRequest["status"],
  actorId: string,
  expectedUpdatedAt?: string,
): Promise<RequestDetail> {
  const { detail, mutated } = await prisma.$transaction(async (tx) => {
    const current = await tx.serviceRequest.findUnique({ where: { id } });
    if (!current) {
      throw new AppError("NOT_FOUND", "Request not found", 404);
    }
    assertFresh(current.updatedAt, expectedUpdatedAt);
    if (current.status === status) {
      const unchanged = await tx.serviceRequest.findUniqueOrThrow({
        where: { id },
        include: detailInclude,
      });
      return { detail: toDetail(unchanged), mutated: false };
    }

    await tx.serviceRequest.update({
      where: { id },
      data: { status, statusRank: STATUS_RANK[status] },
    });

    await tx.activity.create({
      data: {
        requestId: id,
        actorId,
        assigneeId: current.assigneeId,
        type: "STATUS_CHANGED",
        fromValue: current.status,
        toValue: status,
      },
    });

    const updated = await tx.serviceRequest.findUniqueOrThrow({
      where: { id },
      include: detailInclude,
    });
    return { detail: toDetail(updated), mutated: true };
  });
  if (mutated) revalidateWorkload();
  return detail;
}

export async function updateRequestAssignee(
  id: string,
  assigneeId: string | null,
  actorId: string,
  expectedUpdatedAt?: string,
): Promise<RequestDetail> {
  const { detail, mutated } = await prisma.$transaction(async (tx) => {
    const current = await tx.serviceRequest.findUnique({ where: { id } });
    if (!current) {
      throw new AppError("NOT_FOUND", "Request not found", 404);
    }
    assertFresh(current.updatedAt, expectedUpdatedAt);
    if (current.assigneeId === assigneeId) {
      const unchanged = await tx.serviceRequest.findUniqueOrThrow({
        where: { id },
        include: detailInclude,
      });
      return { detail: toDetail(unchanged), mutated: false };
    }

    if (assigneeId) {
      const user = await tx.user.findUnique({ where: { id: assigneeId }, select: { id: true } });
      if (!user) {
        throw new AppError("VALIDATION", "Assignee not found", 400);
      }
    }

    await tx.serviceRequest.update({
      where: { id },
      data: { assigneeId },
    });

    await tx.activity.create({
      data: {
        requestId: id,
        actorId,
        assigneeId,
        type: "ASSIGNEE_CHANGED",
        fromValue: current.assigneeId,
        toValue: assigneeId,
      },
    });

    const updated = await tx.serviceRequest.findUniqueOrThrow({
      where: { id },
      include: detailInclude,
    });
    return { detail: toDetail(updated), mutated: true };
  });
  if (mutated) revalidateWorkload();
  return detail;
}

async function loadCategories() {
  return prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listCategories() {
  return cachedQuery("list-categories", [CACHE_TAGS.categories], loadCategories);
}

export type AssigneeWorkloadRow = AssigneeActivitySummary & { name: string };

const WORKLOAD_BATCH = 1_000;

async function loadAssigneeWorkload(): Promise<{
  byAssignee: AssigneeWorkloadRow[];
  skipped: number;
  ignored: number;
}> {
  const summarizer = createActivitySummarizer();
  const users = await listAssignees();
  let cursorId: string | undefined;

  for (;;) {
    const batch = await prisma.activity.findMany({
      take: WORKLOAD_BATCH,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        requestId: true,
        assigneeId: true,
        type: true,
        toValue: true,
        createdAt: true,
      },
    });
    for (const row of batch) summarizer.add(row);
    if (batch.length < WORKLOAD_BATCH) break;
    cursorId = batch[batch.length - 1]?.id;
  }

  const summary = summarizer.finish();
  const names = new Map(users.map((user) => [user.id, user.name]));

  return {
    byAssignee: summary.byAssignee.map((row) => ({
      ...row,
      name: names.get(row.assigneeId) ?? "Unknown",
    })),
    skipped: summary.skipped,
    ignored: summary.ignored,
  };
}

export async function summarizeAssigneeWorkload() {
  return cachedQuery("assignee-workload", [CACHE_TAGS.workload], loadAssigneeWorkload);
}
