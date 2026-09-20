# Service Request Management Portal

Compact production-like portal for As-Sunnah Foundation. Next.js App Router hosts both the UI and the API. No separate backend and no paid external services.

## Stack

- Next.js 16.3.5 App Router, React 19, TypeScript
- Prisma 6.19.3 + local SQLite
- Zod, jose (JWT cookie session), bcryptjs
- Tailwind CSS, sonner
- Vitest, Playwright

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in at `/login`. Unauthenticated pages redirect there; APIs return `401`.

`npx prisma migrate dev` applies the migration history (schema, rank columns, rank-sort indexes) and generates the Prisma client. `npm run db:seed` writes 6 users, categories, **10,000** requests, and activity history.

### Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path, relative to `prisma/schema.prisma`. Default `file:./dev.db` |
| `AUTH_SECRET` | JWT signing secret, at least 32 characters |

### Test users

All users share the password `Password123!`.

| Email | Name |
|---|---|
| `admin@asf.local` | Admin User |
| `fatima@asf.local` | Fatima Rahman |
| `karim@asf.local` | Karim Hossain |
| `aisha@asf.local` | Aisha Begum |
| `rahman@asf.local` | Abdur Rahman |
| `nadia@asf.local` | Nadia Islam |

Authenticated API: `GET /api/requests` (search/filter/sort/pagination), `GET /api/requests/:id`, `PATCH /api/requests/:id/status`, `PATCH /api/requests/:id/assignee`, and `GET /api/reports/assignees` (per-assignee workload summary over the full activity table; there is no separate reports page).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run db:migrate` | `prisma migrate dev` (same as setup) |
| `npm run db:seed` | Re-seed |
| `npm test` | Vitest (unit, service, component) |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright: 9 tests in `e2e/portal.spec.ts`. Needs a seeded database and `npx playwright install chromium`. Starts or reuses the app on port 3000. |

## Assumptions

- Every authenticated user is an operator. There is no RBAC; any signed-in user can change status and assignee.
- List reads go Server Component → Prisma. Mutations go through Route Handlers.
- Invalid URL query values are coerced to defaults rather than failing the page.

See [TECHNICAL.md](./TECHNICAL.md) for architecture and trade-offs.
