import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getRequestById } from "@/lib/services/requests";
import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession();
    const { id } = await context.params;
    const data = await getRequestById(id);
    if (!data) {
      throw new AppError("NOT_FOUND", "Request not found", 404);
    }
    return NextResponse.json({ data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
