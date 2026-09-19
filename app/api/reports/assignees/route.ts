import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { summarizeAssigneeWorkload } from "@/lib/services/requests";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    await requireSession();
    const result = await summarizeAssigneeWorkload();
    return NextResponse.json({ data: result });
  } catch (error) {
    return toErrorResponse(error);
  }
}
