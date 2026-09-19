import { cache } from "react";
import type { ServiceRequest } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { formatRequestNumber } from "@/lib/format";
import { SORT_COLUMNS, STATUS_RANK } from "@/lib/constants";
import type { RequestQuery } from "@/lib/validations/request-query";
import { buildRequestWhere } from "@/lib/services/request-where";
import { summarizeActivities } from "@/lib/utils/summarize-activities";
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

  const [rows, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      orderBy: { [SORT_COLUMNS[query.sort]]: query.order },
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

export async function updateRequestStatus(
  id: string,
  status: ServiceRequest["status"],
  actorId: string,
): Promise<RequestDetail> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.serviceRequest.findUnique({ where: { id } });
    if (!current) {
      throw new AppError("NOT_FOUND", "Request not found", 404);
    }
    if (current.status === status) {
      throw new AppError("NO_CHANGE", "Status is already set to this value", 400);
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
    return toDetail(updated);
  });
}

export async function updateRequestAssignee(
  id: string,
  assigneeId: string | null,
  actorId: string,
): Promise<RequestDetail> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.serviceRequest.findUnique({ where: { id } });
    if (!current) {
      throw new AppError("NOT_FOUND", "Request not found", 404);
    }
    if (current.assigneeId === assigneeId) {
      throw new AppError("NO_CHANGE", "Assignee is already set to this value", 400);
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
    return toDetail(updated);
  });
}

export async function listCategories() {
  return prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type AssigneeWorkloadRow = AssigneeActivitySummary & { name: string };

/**
 * Runs summarizeActivities over the full activity table (~25k seeded rows),
 * demonstrating the utility at the scale the brief describes.
 */
export async function summarizeAssigneeWorkload(): Promise<{
  byAssignee: AssigneeWorkloadRow[];
  skipped: number;
}> {
  const [activities, users] = await Promise.all([
    prisma.activity.findMany({
      select: {
        requestId: true,
        assigneeId: true,
        type: true,
        toValue: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    listAssignees(),
  ]);

  const summary = summarizeActivities(activities);
  const names = new Map(users.map((user) => [user.id, user.name]));

  return {
    byAssignee: summary.byAssignee.map((row) => ({
      ...row,
      name: names.get(row.assigneeId) ?? "Unknown",
    })),
    skipped: summary.skipped,
  };
}
