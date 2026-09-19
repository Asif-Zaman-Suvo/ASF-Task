import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { toErrorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
