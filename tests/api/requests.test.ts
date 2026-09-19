import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPasswordSync } from "@/lib/auth/password";

process.env.DATABASE_URL = "file:./test.db";
process.env.AUTH_SECRET = "a".repeat(32);

const root = path.resolve(__dirname, "../..");
const testDb = path.join(root, "prisma/test.db");

describe("request service API", () => {
  let listRequests: typeof import("@/lib/services/requests").listRequests;
  let getRequestById: typeof import("@/lib/services/requests").getRequestById;
  let updateRequestStatus: typeof import("@/lib/services/requests").updateRequestStatus;
  let updateRequestAssignee: typeof import("@/lib/services/requests").updateRequestAssignee;
  let summarizeAssigneeWorkload: typeof import("@/lib/services/requests").summarizeAssigneeWorkload;
  let parseRequestQuery: typeof import("@/lib/validations/request-query").parseRequestQuery;
  let prisma: typeof import("@/lib/db").prisma;
  let AppError: typeof import("@/lib/errors").AppError;

  beforeAll(async () => {
    for (const file of [testDb, `${testDb}-journal`]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }

    execSync("npx prisma migrate deploy", {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: "file:./test.db" },
    });

    ({ prisma } = await import("@/lib/db"));
    ({
      listRequests,
      getRequestById,
      updateRequestStatus,
      updateRequestAssignee,
      summarizeAssigneeWorkload,
    } = await import("@/lib/services/requests"));
    ({ parseRequestQuery } = await import("@/lib/validations/request-query"));
    ({ AppError } = await import("@/lib/errors"));

    const passwordHash = hashPasswordSync("Password123!");
    await prisma.user.createMany({
      data: [
        { id: "u1", name: "Admin User", email: "admin@asf.local", passwordHash },
        { id: "u2", name: "Fatima Rahman", email: "fatima@asf.local", passwordHash },
      ],
    });
    await prisma.category.create({ data: { id: "c1", name: "IT Support", slug: "it-support" } });
    await prisma.serviceRequest.create({
      data: {
        id: "req_test_1",
        number: 1,
        title: "Laptop issue #1",
        description: "Test request",
        requesterId: "u1",
        categoryId: "c1",
        priority: "HIGH",
        priorityRank: 3,
        status: "PENDING",
        statusRank: 1,
        assigneeId: "u2",
      },
    });
    await prisma.activity.create({
      data: {
        requestId: "req_test_1",
        actorId: "u1",
        type: "CREATED",
      },
    });

    // Ranks set explicitly so ranked-sort assertions are independent of defaults.
    await prisma.serviceRequest.createMany({
      data: [
        {
          id: "req_test_2",
          number: 2,
          title: "Printer issue #2",
          description: "Test request",
          requesterId: "u2",
          categoryId: "c1",
          priority: "URGENT",
          priorityRank: 4,
          status: "RESOLVED",
          statusRank: 3,
          assigneeId: "u1",
        },
        {
          id: "req_test_3",
          number: 3,
          title: "Network outage #3",
          description: "Test request",
          requesterId: "u2",
          categoryId: "c1",
          priority: "LOW",
          priorityRank: 1,
          status: "CLOSED",
          statusRank: 4,
          assigneeId: null,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists with pagination metadata", async () => {
    const result = await listRequests(parseRequestQuery({ page: "1", limit: "2" }));
    expect(result.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(result.data).toHaveLength(2);
  });

  it("returns a request by id", async () => {
    const detail = await getRequestById("req_test_1");
    expect(detail?.title).toBe("Laptop issue #1");
    expect(detail?.activities).toHaveLength(1);
  });

  it("returns null for unknown ids", async () => {
    await expect(getRequestById("missing")).resolves.toBeNull();
  });

  it("sorts priority by rank, not alphabetically", async () => {
    const result = await listRequests(parseRequestQuery({ sort: "priority", order: "desc" }));
    expect(result.data.map((item) => item.priority)).toEqual(["URGENT", "HIGH", "LOW"]);
  });

  it("sorts status by rank, not alphabetically", async () => {
    const result = await listRequests(parseRequestQuery({ sort: "status", order: "desc" }));
    expect(result.data.map((item) => item.status)).toEqual(["CLOSED", "RESOLVED", "PENDING"]);
  });

  it("updates status and writes activity, rejecting no-ops", async () => {
    const updated = await updateRequestStatus("req_test_1", "IN_PROGRESS", "u1");
    expect(updated.status).toBe("IN_PROGRESS");
    expect(updated.activities.some((item) => item.type === "STATUS_CHANGED")).toBe(true);

    await expect(updateRequestStatus("req_test_1", "IN_PROGRESS", "u1")).rejects.toMatchObject({
      code: "NO_CHANGE",
      status: 400,
    });
  });

  it("updates assignee and rejects unknown users", async () => {
    const updated = await updateRequestAssignee("req_test_1", "u1", "u2");
    expect(updated.assignee?.id).toBe("u1");

    try {
      await updateRequestAssignee("req_test_1", "nope", "u1");
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).code).toBe("VALIDATION");
    }
  });

  it("summarizes the full activity dataset per assignee", async () => {
    const result = await summarizeAssigneeWorkload();

    const admin = result.byAssignee.find((row) => row.assigneeId === "u1");
    expect(admin).toMatchObject({ name: "Admin User", totalAssigned: 1, totalResolved: 0 });
    expect(result.skipped).toBeGreaterThanOrEqual(2);
  });
});
