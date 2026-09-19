import { PrismaClient, type ActivityType, type Priority, type Status } from "@prisma/client";
import { PRIORITY_RANK, STATUS_RANK } from "../lib/constants";
import { hashPasswordSync } from "../lib/auth/password";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";
const REQUEST_COUNT = 10_000;
const BATCH_SIZE = 80;

const USERS = [
  { id: "user_admin", name: "Admin User", email: "admin@asf.local" },
  { id: "user_fatima", name: "Fatima Rahman", email: "fatima@asf.local" },
  { id: "user_karim", name: "Karim Hossain", email: "karim@asf.local" },
  { id: "user_aisha", name: "Aisha Begum", email: "aisha@asf.local" },
  { id: "user_rahman", name: "Abdur Rahman", email: "rahman@asf.local" },
  { id: "user_nadia", name: "Nadia Islam", email: "nadia@asf.local" },
] as const;

const CATEGORIES = [
  { id: "cat_it", name: "IT Support", slug: "it-support" },
  { id: "cat_facilities", name: "Facilities", slug: "facilities" },
  { id: "cat_finance", name: "Finance", slug: "finance" },
  { id: "cat_hr", name: "HR", slug: "hr" },
  { id: "cat_programs", name: "Programs", slug: "programs" },
  { id: "cat_general", name: "General", slug: "general" },
] as const;

const STATUSES: Status[] = ["PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const TITLE_TEMPLATES = [
  "Laptop issue",
  "Printer not working",
  "Access card request",
  "Payroll inquiry",
  "Venue booking",
  "Software license",
  "Network outage",
  "Office supplies",
  "Volunteer onboarding",
  "Donation receipt",
  "Classroom projector",
  "Email account setup",
];

const DESCRIPTIONS = [
  "Please review and action this request at the earliest convenience.",
  "Requester needs an update before the end of the week.",
  "This is blocking another internal process.",
  "Follow up with the requester after assignment.",
];

async function createManyInBatches<T>(
  label: string,
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await insert(rows.slice(i, i + BATCH_SIZE));
    if (i > 0 && i % 1000 === 0) {
      console.log(`  ${label}: ${Math.min(i, rows.length)}/${rows.length}`);
    }
  }
  console.log(`  ${label}: ${rows.length}/${rows.length}`);
}

async function main() {
  console.log("Seeding database...");

  await prisma.activity.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = hashPasswordSync(PASSWORD);

  await prisma.user.createMany({
    data: USERS.map((user) => ({ ...user, passwordHash })),
  });
  await prisma.category.createMany({ data: [...CATEGORIES] });

  const now = Date.now();
  const requests = Array.from({ length: REQUEST_COUNT }, (_, index) => {
    const n = index + 1;
    const createdAt = new Date(now - (REQUEST_COUNT - index) * 45 * 60_000);
    const unassigned = n % 10 === 0;
    const status = STATUSES[n % STATUSES.length];
    const assigneeId = unassigned ? null : USERS[(n + 1) % USERS.length].id;

    return {
      id: `req_${String(n).padStart(5, "0")}`,
      number: n,
      title: `${TITLE_TEMPLATES[n % TITLE_TEMPLATES.length]} #${n}`,
      description: DESCRIPTIONS[n % DESCRIPTIONS.length],
      requesterId: USERS[n % USERS.length].id,
      categoryId: CATEGORIES[n % CATEGORIES.length].id,
      priority: PRIORITIES[n % PRIORITIES.length],
      priorityRank: PRIORITY_RANK[PRIORITIES[n % PRIORITIES.length]],
      status,
      statusRank: STATUS_RANK[status],
      assigneeId,
      createdAt,
      updatedAt: createdAt,
    };
  });

  await createManyInBatches("requests", requests, (data) =>
    prisma.serviceRequest.createMany({ data }),
  );

  const activities: Array<{
    id: string;
    requestId: string;
    actorId: string;
    assigneeId: string | null;
    type: ActivityType;
    fromValue: string | null;
    toValue: string | null;
    createdAt: Date;
  }> = [];

  for (const request of requests) {
    const createdAt = new Date(request.createdAt.getTime() + 60_000);
    activities.push({
      id: `${request.id}_created`,
      requestId: request.id,
      actorId: request.requesterId,
      assigneeId: request.assigneeId,
      type: "CREATED",
      fromValue: null,
      toValue: null,
      createdAt,
    });

    if (request.assigneeId) {
      activities.push({
        id: `${request.id}_assigned`,
        requestId: request.id,
        actorId: USERS[0].id,
        assigneeId: request.assigneeId,
        type: "ASSIGNEE_CHANGED",
        fromValue: null,
        toValue: request.assigneeId,
        createdAt: new Date(createdAt.getTime() + 30 * 60_000),
      });
    }

    if (request.status !== "PENDING") {
      activities.push({
        id: `${request.id}_status`,
        requestId: request.id,
        actorId: request.assigneeId ?? USERS[0].id,
        assigneeId: request.assigneeId,
        type: "STATUS_CHANGED",
        fromValue: "PENDING",
        toValue: request.status,
        createdAt: new Date(createdAt.getTime() + 3 * 60 * 60_000),
      });
    }
  }

  await createManyInBatches("activities", activities, (data) =>
    prisma.activity.createMany({ data }),
  );

  console.log(`Seeded ${USERS.length} users, ${CATEGORIES.length} categories, ${requests.length} requests, ${activities.length} activities.`);
  console.log(`Login: ${USERS[0].email} / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
