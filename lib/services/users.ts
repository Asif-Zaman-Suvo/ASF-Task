import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPasswordSync, verifyPassword } from "@/lib/auth/password";
import { cachedQuery, CACHE_TAGS } from "@/lib/cache-tags";
import type { SessionUser } from "@/lib/auth/types";

const TIMING_PAD_HASH = hashPasswordSync("invalid-credentials-timing-pad");

export async function authenticateUser(email: string, password: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  const hash = user?.passwordHash ?? TIMING_PAD_HASH;
  const matches = await verifyPassword(password, hash);

  if (!user || !matches) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  return { id: user.id, email: user.email, name: user.name };
}

async function loadAssignees() {
  return prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listAssignees() {
  return cachedQuery("list-assignees", [CACHE_TAGS.assignees], loadAssignees);
}
