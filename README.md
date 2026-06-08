# Lift Tracker

A personal, opinionated powerlifting tracker that *knows one specific program*. It stores
Training Maxes (TMs), generates each session's prescribed weights from the program's
percentages, lets you log sets fast on a phone at the gym, and auto-progresses the TM based
on your AMRAP performance.

See [`PRD.md`](./PRD.md) for product scope, [`PROGRAM.md`](./PROGRAM.md) for the training
methodology this app encodes, and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a technical
walkthrough of how the app is built (data model, the isolated engine, request flow, gotchas).

## Stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS** — mobile-first.
- **Neon** serverless Postgres via **Drizzle ORM** (`@neondatabase/serverless`).
- **Server Actions** for all writes (single-user, no separate API layer).
- **iron-session** for a simple single-athlete password login.
- **Recharts** for progress visuals.

## The progression engine

Everything program-specific lives in [`lib/program/`](./lib/program) as **pure functions with
zero DB or React imports**. To change how progression works, you only touch that folder:

- `config.ts` — HML percentages, the 4-week wave table, rep schemes, the Day 1–4 weekly template.
- `generateSession.ts` — turns `{ tms, phase, weekIndex, dayNumber }` into prescribed sets.
- `progression.ts` — AMRAP → proposed TM change (encodes PROGRAM.md §7).
- `estimate1rm.ts` — Epley / Brzycki estimators.
- `rounding.ts` — round loads to the configured plate increment.

Unit tests in `lib/program/__tests__/` pin the engine to the PROGRAM.md §9 Day 1 example.

## Setup

1. Install deps:

```bash
npm install
```

2. Create a Neon project at https://console.neon.tech and copy the pooled connection string.

3. Create `.env.local` from the example and fill it in:

```bash
cp .env.example .env.local
```

```
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
APP_PASSWORD="your-gym-password"
SESSION_SECRET="$(openssl rand -base64 32)"
```

4. Create the schema and seed the starting data (athlete + TMs Bench 90 / DL 205, Phase 0)
   plus the bundled exercise catalog:

```bash
npm run db:push
npm run db:seed
npm run db:seed-exercises
```

5. Run it:

```bash
npm run dev
```

Open http://localhost:3000 and log in with `APP_PASSWORD`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Run the progression-engine unit tests (Vitest) |
| `npm run db:push` | Push the Drizzle schema to Neon |
| `npm run db:generate` / `db:migrate` | Generate / apply SQL migrations |
| `npm run db:seed` | Seed athlete, TMs and program config |
| `npm run db:seed-exercises` | Load the bundled exercise catalog (free-exercise-db, ~870 exercises) |
| `npm run db:studio` | Open Drizzle Studio |

## Exercise catalog

Accessories can be logged with weight/reps, and you can add or swap accessory exercises from a
searchable catalog. The catalog is the public-domain [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(~870 exercises) bundled at `data/exercises.json` and seeded into the `exercise` table — no API
keys, no rate limits, no runtime third-party calls. Search is served by `/api/exercises`.

## Deploy

Deploy to Vercel; set `DATABASE_URL`, `APP_PASSWORD`, and `SESSION_SECRET` as environment
variables. Online-only (no offline sync) for v1 — see PRD §8 for the v2 backlog.
