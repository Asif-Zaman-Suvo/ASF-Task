import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { verifyPassword } from "@/lib/auth/password";
import type { SessionUser } from "@/lib/auth/types";

export async function authenticateUser(email: string, password: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  return { id: user.id, email: user.email, name: user.name };
}

export async function listAssignees() {
  return prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
