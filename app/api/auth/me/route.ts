import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const user = await requireSession();
    return NextResponse.json({ data: user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
