/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
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

const assignees = [{ id: "u1", name: "Admin User" }];

function renderActions() {
  return render(
    <RequestActions
      requestId="req_1"
      status="PENDING"
      assigneeId="u1"
      assignees={assignees}
      updatedAt="2026-01-01T00:00:00.000Z"
    />,
  );
}

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
    renderActions();

    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");
    expect(screen.getByLabelText("Status")).toBeDisabled();
    expect(screen.getByLabelText("Assignee")).toBeDisabled();
    expect(screen.getByText("Saving changes…")).toBeInTheDocument();

    resolveFetch({
      ok: true,
      json: async () => ({ data: { status: "IN_PROGRESS" } }),
    });
  });

  it("sends updatedAt and restores focus after save", async () => {
    let resolveFetch: (value: unknown) => void = () => undefined;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderActions();

    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");
    expect(screen.getByLabelText("Status")).toBeDisabled();

    resolveFetch({
      ok: true,
      json: async () => ({ data: { status: "IN_PROGRESS" } }),
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Status")).toBeEnabled();
    });
    expect(screen.getByLabelText("Status")).toHaveFocus();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      status: "IN_PROGRESS",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });
});
