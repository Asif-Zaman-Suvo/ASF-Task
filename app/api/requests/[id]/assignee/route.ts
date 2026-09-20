import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { updateAssigneeSchema } from "@/lib/validations/mutations";
import { updateRequestAssignee } from "@/lib/services/requests";
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
    const { assigneeId, updatedAt } = updateAssigneeSchema.parse(json);
    const data = await updateRequestAssignee(id, assigneeId, session.id, updatedAt);
    return NextResponse.json({ data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
