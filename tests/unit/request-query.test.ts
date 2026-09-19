import { describe, expect, it } from "vitest";
import { parseRequestQuery } from "@/lib/validations/request-query";
import { buildRequestWhere } from "@/lib/services/request-where";

describe("parseRequestQuery", () => {
  it("applies defaults", () => {
    expect(parseRequestQuery({})).toMatchObject({
      search: "",
      page: 1,
      limit: 20,
      sort: "updatedAt",
      order: "desc",
    });
  });

  it("drops invalid enums and coerces invalid page/limit", () => {
    const query = parseRequestQuery({
      status: "NOPE",
      priority: "HIGH",
      page: "-2",
      limit: "999",
      sort: "unknown",
      order: "asc",
      search: "laptop",
    });

    expect(query.status).toBeUndefined();
    expect(query.priority).toBe("HIGH");
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
    expect(query.sort).toBe("updatedAt");
    expect(query.order).toBe("asc");
    expect(query.search).toBe("laptop");
  });
});

describe("buildRequestWhere", () => {
  it("builds unassigned, search, and filter clauses", () => {
    const where = buildRequestWhere(
      parseRequestQuery({
        search: "laptop",
        status: "PENDING",
        assigneeId: "unassigned",
      }),
    );

    expect(where).toEqual({
      AND: [
        { status: "PENDING" },
        { assigneeId: null },
        {
          OR: [
            { title: { contains: "laptop" } },
            { requester: { name: { contains: "laptop" } } },
          ],
        },
      ],
    });
  });
});
