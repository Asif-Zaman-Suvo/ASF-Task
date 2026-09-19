import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { authenticateUser } from "@/lib/services/users";
import { setSessionCookie, signSession } from "@/lib/auth/session";
import { assertSameOrigin, toErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const json = await request.json().catch(() => null);
    const input = loginSchema.parse(json);
    const user = await authenticateUser(input.email, input.password);
    const token = await signSession(user);
    await setSessionCookie(token);
    return NextResponse.json({ data: user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
