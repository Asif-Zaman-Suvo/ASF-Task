"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import {
  requestQueryToSearchParams,
  type RequestQuery,
} from "@/lib/validations/request-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ListTransitionContext } from "@/components/requests/list-transition";

type Option = { id: string; name: string };

export function RequestFilters({
  query,
  categories,
  assignees,
  children,
}: {
  query: RequestQuery;
  categories: Option[];
  assignees: Option[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query.search);
  const [prevQuerySearch, setPrevQuerySearch] = useState(query.search);
  const [isPending, startTransition] = useTransition();
  const queryRef = useRef(query);

  if (query.search !== prevQuerySearch) {
    setPrevQuerySearch(query.search);
    setSearch(query.search);
  }

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  function replace(next: Partial<RequestQuery>) {
    const merged = { ...queryRef.current, ...next };
    queryRef.current = merged;
    const params = requestQueryToSearchParams(merged);
    const href = params.toString() ? `/requests?${params}` : "/requests";
    startTransition(() => {
      router.replace(href);
    });
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (search.trim() === queryRef.current.search) return;
      replace({ search: search.trim(), page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on typed search; latest filters come from queryRef
  }, [search]);

  function onFilterChange(key: keyof RequestQuery, value: string) {
    replace({ [key]: value || undefined, page: 1 } as Partial<RequestQuery>);
  }

  function clearAll() {
    setSearch("");
    startTransition(() => router.replace("/requests"));
  }

  const hasFilters = Boolean(
    query.search || query.status || query.priority || query.categoryId || query.assigneeId,
  );

  return (
    <div className="space-y-4">
      <form
        role="search"
        aria-label="Request filters"
        className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            name="search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title or requester"
            autoComplete="off"
            enterKeyHint="search"
            aria-describedby="search-hint"
          />
          <p id="search-hint" className="mt-1 text-xs text-slate-600">
            Results update as you type.
          </p>
        </div>
        <Select
          id="status"
          label="Status"
          value={query.status ?? ""}
          onChange={(event) => onFilterChange("status", event.target.value)}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </Select>
        <Select
          id="priority"
          label="Priority"
          value={query.priority ?? ""}
          onChange={(event) => onFilterChange("priority", event.target.value)}
        >
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </Select>
        <Select
          id="categoryId"
          label="Category"
          value={query.categoryId ?? ""}
          onChange={(event) => onFilterChange("categoryId", event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          id="assigneeId"
          label="Assignee"
          value={query.assigneeId ?? ""}
          onChange={(event) => onFilterChange("assigneeId", event.target.value)}
        >
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.name}
            </option>
          ))}
        </Select>
        <Select
          id="sort"
          label="Sort by"
          value={query.sort}
          onChange={(event) => onFilterChange("sort", event.target.value)}
        >
          <option value="updatedAt">Last updated</option>
          <option value="createdAt">Created</option>
          <option value="number">ID</option>
          <option value="priority">Priority</option>
          <option value="status">Status</option>
        </Select>
        <Select
          id="order"
          label="Order"
          value={query.order}
          onChange={(event) => onFilterChange("order", event.target.value)}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </Select>
        {hasFilters ? (
          <div className="flex items-end sm:col-span-2 xl:col-span-1">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={clearAll}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </form>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isPending ? "Updating results" : null}
      </div>

      <ListTransitionContext.Provider value={startTransition}>
        <div id="request-results" className="relative" aria-busy={isPending}>
          {isPending ? (
            <p className="mb-2 text-sm text-slate-600" aria-hidden>
              Updating results…
            </p>
          ) : null}
          <div className={isPending ? "opacity-60" : undefined}>{children}</div>
        </div>
      </ListTransitionContext.Provider>
    </div>
  );
}
