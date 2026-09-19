import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { parseRequestQuery } from "@/lib/validations/request-query";
import { listRequests } from "@/lib/services/requests";
import { toErrorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams.entries());
    const query = parseRequestQuery(raw);
    const result = await listRequests(query);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
