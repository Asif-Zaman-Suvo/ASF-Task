import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { updateStatusSchema } from "@/lib/validations/mutations";
import { updateRequestStatus } from "@/lib/services/requests";
import { assertSameOrigin, toErrorResponse } from "@/lib/api-error";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await context.params;
    const json = await request.json().catch(() => null);
    const { status } = updateStatusSchema.parse(json);
    const data = await updateRequestStatus(id, status, session.id);
    return NextResponse.json({ data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
