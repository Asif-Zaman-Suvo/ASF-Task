# Service Request Management Portal

Compact production-like portal for As-Sunnah Foundation. Next.js App Router hosts both the UI and the API. No separate backend.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Prisma + SQLite
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

Open [http://localhost:3000](http://localhost:3000).

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

Seed creates **10,000** requests plus activity history.

Authenticated API: `GET /api/requests` (search/filter/sort/pagination), `GET /api/requests/:id`, `PATCH /api/requests/:id/status`, `PATCH /api/requests/:id/assignee`, and `GET /api/reports/assignees` (per-assignee workload summary over the full activity table).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build |
| `npm run db:seed` | Re-seed |
| `npm test` | Vitest (unit, service, component) |
| `npm run test:e2e` | Playwright (needs a seeded database and `npx playwright install chromium`) |
| `npm run lint` | ESLint |

## Assumptions

- Every authenticated user is an operator. There is no RBAC; any signed-in user can change status and assignee.
- List reads go Server Component → Prisma. Mutations go through Route Handlers.
- Invalid URL query values are coerced to defaults rather than failing the page.

See [TECHNICAL.md](./TECHNICAL.md) for architecture and trade-offs.
