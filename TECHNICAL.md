# Technical note

## Architecture

```
Browser → proxy.ts (JWT cookie)
       → App Router pages (RSC) → services → Prisma → SQLite
       → Client islands → Route Handlers → requireSession → services
```

Pages never HTTP-call themselves for the initial list/detail payload. Route Handlers exist because the assessment requires real API operations, HTTP status codes, and mutation endpoints the browser can call.

## Server vs Client Components

| Server | Client |
|---|---|
| Dashboard page, table markup, details page, activity timeline | Search, filters, sort, pagination, login, header/logout, status/assignee selectors, toasts |

JavaScript ships only where there is interaction. The table is HTML from the server so 20 rows do not need a client data grid.

## Data fetching and state

- **List/detail reads:** RSC + `searchParams` / `params` + `dynamic = 'force-dynamic'`. Direct URL access and refresh work because the server re-reads the database. `getRequestById` is wrapped in React `cache()`, so `generateMetadata` and the page share a single DB round-trip.
- **List UI state:** the URL. Debounced search (300ms) and filters call `router.replace` inside `useTransition` so the previous table stays visible with an updating indicator.
- **Mutations:** `PATCH` Route Handlers, `useOptimistic` + `useTransition`, then `router.refresh()`. Pending disables both selectors. Failures toast and roll back to the last server-rendered value.
- **TanStack Query is not used.** A client cache would duplicate the URL + RSC as source of truth and fight `router.refresh()`.

## Performance

- Server-side `where` / `orderBy` / `skip` / `take`. Max page size 50. The browser never receives 10k rows.
- Indexes on `status`, `priority`, `categoryId`, `assigneeId`, `updatedAt`, `number`, plus composites with `updatedAt`. SQLite cannot use `autoincrement()` on a non-id column, so `number` is assigned in seed (portable to a Postgres sequence later).
- Title search uses SQLite `LIKE` (`contains`). That cannot use a B-tree for `%term%`; 10k rows is acceptable. Postgres would add `pg_trgm`.
- SQLite sorts enum text alphabetically, so `priority`/`status` sorts use `priorityRank`/`statusRank` integer columns (LOW→URGENT / PENDING→CLOSED). A migration backfills existing rows; seed and the status-update path keep ranks in sync.
- Offset pagination is URL-friendly. Deep offsets are not a problem at this size. Cursor pagination would be the next step.
- DTOs are selected fields, not full Prisma graphs. Activities load only on the detail page.

## Security

- httpOnly, SameSite=Lax session cookie. JWT via `jose` (Edge-safe verify in `proxy.ts`; Next.js 16 renamed middleware to proxy).
- Pages redirect to `/login?from=…`; APIs return `401` JSON. Invalid tokens are unauthenticated, not 500.
- `from` is restricted to internal paths to avoid open redirects.
- Mutating routes check `Origin` against the request URL.
- Passwords hashed with bcryptjs. Credentials errors do not reveal whether the email exists.
- No RBAC: any authenticated user can update any request. That matches the brief.

## Error handling

- `loading.tsx` for first load / hard navigation.
- Client `aria-busy` for search/filter updates.
- Distinct empty states for “no data” vs “no matches”.
- `error.tsx` + retry, `not-found.tsx` for unknown ids.
- Zod on login, query params, and mutation bodies. Invalid query params are dropped/defaulted so a bad URL does not crash the dashboard.
- Client fetch timeout is 10s.

## `summarizeActivities`

Single pass, O(n) time, O(k + r) memory. Invalid records increment `skipped` and never throw. `ASSIGNEE_CHANGED` counts assigned. `STATUS_CHANGED` to `RESOLVED` counts resolved for the assignee currently attached to that `requestId`. Duration is included in the average only when `resolvedAt >= assignedAt`. Input is not sorted; seed and API emit chronological events.

`GET /api/reports/assignees` runs the utility over the whole activity table (~26.5k seeded rows) and returns per-assignee workload with display names, plus the `skipped` count.

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
