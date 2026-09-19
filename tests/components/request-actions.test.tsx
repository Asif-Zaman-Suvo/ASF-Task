/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestActions } from "@/components/requests/request-actions";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("RequestActions", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: "IN_PROGRESS" } }),
      }),
    );
  });

  it("disables selectors while a mutation is in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    const user = userEvent.setup();
    render(
      <RequestActions
        requestId="req_1"
        status="PENDING"
        assigneeId="u1"
        assignees={[{ id: "u1", name: "Admin User" }]}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");
    expect(screen.getByLabelText("Status")).toBeDisabled();
    expect(screen.getByLabelText("Assignee")).toBeDisabled();
    expect(screen.getByText("Saving changes…")).toBeInTheDocument();

    resolveFetch({
      ok: true,
      json: async () => ({ data: { status: "IN_PROGRESS" } }),
    });
  });
});
