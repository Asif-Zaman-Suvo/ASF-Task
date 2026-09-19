import { FETCH_TIMEOUT_MS } from "@/lib/constants";
import type { ErrorBody } from "@/lib/errors";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const body = (await response.json().catch(() => null)) as T | ErrorBody | null;

    if (!response.ok) {
      const error = body && typeof body === "object" && "error" in body ? body.error : null;
      throw new ApiClientError(
        response.status,
        error?.code ?? "HTTP_ERROR",
        error?.message ?? "Request failed",
        error?.details,
      );
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError(0, "TIMEOUT", "The request timed out. Try again.");
    }
    throw new ApiClientError(0, "NETWORK", "Network error. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}
