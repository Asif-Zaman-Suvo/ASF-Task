# Technical note

Next.js 16.3.5 App Router + Prisma 6.19.3 + local SQLite. No paid external services.

## Architecture

```
Browser → proxy.ts (JWT cookie)
       → App Router pages (RSC) → services → Prisma → SQLite
       → Client islands → Route Handlers → requireSession → services
```

Pages never HTTP-call themselves for the initial list/detail payload. Route Handlers exist because the assessment requires real API operations, HTTP status codes, and mutation endpoints the browser can call.

| Path | Role |
|---|---|
| `app/` | Pages, `loading`/`error`/`not-found`, Route Handlers |
| `components/` | UI primitives and client islands (filters, actions, login, header) |
| `lib/` | Auth, services, validations, `summarize-activities` |
| `prisma/` | Schema, migrations, seed |
| `proxy.ts` | JWT gate (Next.js 16 proxy, formerly middleware) |
| `tests/` | Vitest |
| `e2e/` | Playwright (`portal.spec.ts`, 12 tests) |

## Server vs Client Components

| Server | Client |
|---|---|
| Dashboard page, table/card markup, details page, activity timeline | Search, filters, sort, pagination, login, header/logout, status/assignee selectors, toasts |

JavaScript ships only where there is interaction. The table is HTML from the server so 20 rows do not need a client data grid.

## Data fetching and state

- **List/detail reads:** RSC + `searchParams` / `params` + `dynamic = 'force-dynamic'`. Direct URL access and refresh work because the server re-reads the database. `getRequestById` is wrapped in React `cache()`, so `generateMetadata` and the page share a single DB round-trip. Detail loads chronological activity history.
- **List UI state:** the URL (`search`, `status`, `priority`, `categoryId`, `assigneeId`, `sort`, `order`, `page`, `limit`). Debounced search (300ms) and filters call `router.replace` inside `useTransition` so the previous table stays visible with an updating indicator. Pagination uses `<Link>` + `router.push` in the same transition, so the table dims. Refresh keeps the same query. `page` beyond `totalPages` redirects to the last page.
- **Mutations:** `PATCH` Route Handlers via `apiFetch` (10s timeout). Status and assignee both use `useOptimistic` + `useTransition`, then `router.refresh()`. `isPending` disables the fieldset so duplicate submits cannot fire; focus returns to the last-edited select when saving finishes. A PATCH whose value already matches returns 200 with the current state and writes nothing, regardless of `updatedAt`. A real change with a stale `updatedAt` returns `409 CONFLICT`. `updatedAt` must be a valid ISO datetime (`400` otherwise). The write is a compare-and-swap on `updatedAt`. Failures toast and roll back to the last server-rendered value; `409` also `router.refresh()`s.
- **Reference data cache:** `listCategories` and `listAssignees` use `unstable_cache` with tags (`categories`, `assignees`) and a 5-minute revalidate. Users and categories are seed-only, so those tags are not invalidated at runtime. List/detail pages stay `force-dynamic` because the request table is live.
- **Workload cache:** `GET /api/reports/assignees` is tagged `assignee-workload` with a 5-minute expiry. Real status/assignee writes call `revalidateTag(tag, "max")`, which is stale-while-revalidate, so the first report read after a mutation may return the previous snapshot; the next read is fresh. The loader streams activities in 1_000-row Prisma cursor batches (`createdAt, id`) into `createActivitySummarizer().add` for every row, then `finish` once after the loop, so the report path does not materialize the full activity table as one array.
- **TanStack Query is not used.** A client cache would duplicate the URL + RSC as source of truth and fight `router.refresh()`.

## Performance

- Server-side `where` / `orderBy` / `skip` / `take`. Default page size 20, max 50. The browser never receives 10k rows.
- `orderBy` is `[sortColumn, number asc]` so offset pages do not shuffle rows that share a rank.
- Filter indexes: `status`, `priority`, `categoryId`, `assigneeId`, `updatedAt`, `number`, plus `[status, updatedAt]`, `[priority, updatedAt]`, `[assigneeId, updatedAt]`, `[categoryId, updatedAt]`.
- Rank-sort indexes: `[statusRank, updatedAt]`, `[priorityRank, updatedAt]`. Left-prefix covers `ORDER BY statusRank|priorityRank`.
- SQLite cannot use `autoincrement()` on a non-id column, so `number` is assigned in seed (portable to a Postgres sequence later).
- Title/requester search uses SQLite `LIKE` (`contains`). That cannot use a B-tree for `%term%`; 10k rows is acceptable. Postgres would add `pg_trgm`.
- SQLite sorts enum text alphabetically, so `priority`/`status` sorts use `priorityRank`/`statusRank` integer columns (LOW→URGENT / PENDING→CLOSED). A migration backfills existing rows; seed and the status-update path keep ranks in sync.
- Offset pagination is URL-friendly. Deep offsets are not a problem at this size. Cursor pagination would be the next step. Out-of-range `?page=` redirects to the last page (or page 1 when there are no rows).
- Seed uses mulberry32 so status, priority, assignee, category, and resolution delays are not locked together by `n % k`. All 16 status×priority pairs appear, and every assignee gets resolved work.
- DTOs are selected fields, not full Prisma graphs. Activities load only on the detail page.

## Security

- httpOnly, SameSite=Lax session cookie (`asf_session`). JWT via `jose` (Edge-safe verify in `proxy.ts`). `secure` in production.
- Pages redirect to `/login?from=…`; APIs return `401` JSON. Invalid tokens are unauthenticated, not 500.
- `from` is restricted to internal paths to avoid open redirects.
- Mutating routes check `Origin` against the request URL.
- Passwords hashed with bcryptjs. Credentials errors do not reveal whether the email exists.
- No RBAC: any authenticated user can update any request. That matches the brief.

## Error handling

- `loading.tsx` for first load / hard navigation.
- Client `aria-busy` for search/filter updates.
- Distinct empty states for “no data” vs “no matches”.
- `error.tsx` / `global-error.tsx` / route `error.tsx` + retry. User-facing copy is “Something went wrong. Please try again.” The real error is `console.error`’d; `error.message` is not rendered.
- `not-found.tsx` for unknown ids.
- Zod on login, query params, and mutation bodies. Invalid query params are dropped/defaulted so a bad URL does not crash the dashboard.
- Client fetch timeout is 10s (`apiFetch`). Logout uses the same helper and only redirects after a successful response.

## `summarizeActivities`

Single pass, O(n) time, O(k + r) memory. Never throws. `skipped` is malformed/incomplete records; `ignored` is valid noise (`CREATED`, non-RESOLVED status, explicit unassign, extra resolve with no open assignment). `ASSIGNEE_CHANGED` with an id counts assigned and opens pairing. `assigneeId: null` is an unassign: pairing clears and the event is ignored. A missing `assigneeId` key is skipped and does not clear pairing. `STATUS_CHANGED` to `RESOLVED` counts for the current assignee and closes pairing, so reopen + resolve cannot inflate totals. Duration is included in the average only when `resolvedAt >= assignedAt`.

Precondition: activities for the same `requestId` must already be in chronological `createdAt` order. The function does not sort. `summarizeActivities` is a convenience wrapper. The report loader calls `createActivitySummarizer().add` for every row across all cursor batches and calls `finish` once after the loop. Callers already pass chronological order (detail `include.activities.orderBy: createdAt asc`, report `orderBy: [{ createdAt: "asc" }, { id: "asc" }]`).

`GET /api/reports/assignees` streams the activity table (~26.5k seeded rows) in cursor batches through that summarizer and returns per-assignee totals (assigned, resolved, average resolution time) plus `skipped` and `ignored`. The result is cached under the `assignee-workload` tag with a 5-minute expiry; `revalidateTag(tag, "max")` after a real mutation is stale-while-revalidate. The detail page still runs `summarizeActivities` on that request’s history (“Workload from history”). There is no separate reports dashboard.

## Responsive and accessibility

Below `lg`, the dashboard is a card list; from `lg` it is a table. Native labelled `<select>`/`<input>`, `min-h-11` targets, skip-to-content, `aria-busy` while filters or mutations are pending. Filter form landmark is “Request filters”; the search field is labelled “Search”.

## Trade-offs

| Choice | Why | Cost |
|---|---|---|
| SQLite | Zero extra services for reviewers | Weaker concurrent writes; E2E is serial |
| Custom JWT vs Auth.js | Small, explicit, enough for this brief | No OAuth/session table |
| Native `<select>` vs Radix | Better mobile + less JS | Less custom styling |
| Offset vs cursor | Matches `?page=` | Slower at huge offsets |
| RSC list vs client fetch | Demonstrates App Router; URL is the query | Search uses a navigation; `useTransition` is required so it does not feel like a full reload |
| No TanStack Query | Avoid dual sources of truth | Less client retry machinery; we handle timeout/rollback ourselves |

Postgres + Prisma is the production shape (concurrency, `pg_trgm`). The schema is portable; swap `provider` and `DATABASE_URL` when that is justified.
