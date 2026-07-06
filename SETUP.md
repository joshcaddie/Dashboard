# Schoolhub CRM

A dual-agency CRM implemented from the Claude Design handoff in `project/`. A faithful,
fully-interactive rebuild of the prototype, backed by a real database and REST API.

- **Frontend** — React 18 + Vite + TypeScript (`client/`)
- **Backend** — Express + Prisma + **PostgreSQL** (`server/`), which also serves the built frontend
- **One service** — in production the Express server serves both the API (`/api/*`) and the
  React app, so the whole thing runs from a single URL.

Two agencies (**School Websites NZ** and **Caddie Digital**) plus a **Combined** view.
The top-left switcher re-themes the whole app and scopes every list — each agency has its
own clients, sales, jobs, tasks, and dashboard figures.

## Prerequisites

- Node 20+ (22 recommended)
- A PostgreSQL database. For local dev either a local Postgres or a free
  [Neon](https://neon.tech) branch works. Put the connection string in `server/.env`
  (copy `server/.env.example`).

## Local development

```bash
# 1. Point the DB at Postgres
cp server/.env.example server/.env         # then edit DATABASE_URL

# 2. Install deps + create tables + seed sample data
npm run setup

# 3. Run the API (port 4000) and the web app (port 5173) together
npm run dev
```

Open http://localhost:5173 — the Vite dev server proxies `/api/*` to the backend.

Run the two services separately if you prefer: `npm run dev:server` / `npm run dev:client`.
Reset the sample data with `npm run db:reset`.

## Deploy live (Render + Neon, free tier)

The app is packaged as a single Render web service that serves the API and the frontend.
Data lives in a free Neon Postgres database so it survives restarts.

1. **Create the database (Neon).** Sign up at [neon.tech](https://neon.tech), create a
   project, and copy the connection string (it looks like
   `postgresql://user:pass@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require`).

2. **Push this repo to GitHub.** (An empty repo is enough — see the deploy chat for the
   exact push commands.)

3. **Create the Render service.** In [Render](https://render.com):
   New → **Blueprint** → connect the GitHub repo. Render reads `render.yaml` and configures
   the service automatically. When prompted, set:
   - `DATABASE_URL` → your Neon connection string
   - `ANTHROPIC_API_KEY` → *(optional)* your Anthropic key to enable real AI email drafting

   (Or do it manually: New → **Web Service** → Build `npm run render-build`,
   Start `npm run start`, Health check `/api/health`.)

4. **Deploy.** On first boot the server creates the tables and seeds the sample data
   automatically (only if the database is empty — redeploys never wipe your data). Render
   gives you a public `https://schoolhub-crm.onrender.com`-style URL.

> Free-tier note: the service sleeps after ~15 min idle and takes ~30–60s to wake on the
> next request. Upgrade to a paid instance for always-on.

## AI email generation

The "Generate with AI" button posts to `POST /api/ai/email`, which calls Claude
(`claude-opus-4-8`) via the Anthropic SDK when `ANTHROPIC_API_KEY` is set. Without a key it
falls back to a local draft generator. Either way the response uses merge placeholders
(`{{school_name}}`, etc.) that the frontend resolves against the selected recipient.

## Gmail integration

The email-history page uses demo data today with a "Connect Gmail" affordance — the
`GET /api/sent-emails` endpoint and the archive view are the seams to wire a real Gmail
sync into later.

## Project layout

```
render.yaml              # Render Blueprint (one web service)
package.json             # root scripts: setup / dev / render-build / start
server/
  prisma/schema.prisma   # Postgres schema for every entity
  prisma/seed.ts         # sample data from the design prototype
  prisma/seedIfEmpty.ts  # idempotent seed used on deploy
  src/index.ts           # Express API + serves the built client
  src/routes/*.ts        # REST endpoints
  src/dashboardConfig.ts # per-workspace revenue figures & chart baselines
client/
  src/store.tsx          # app data + navigation state, backed by the API
  src/derive.ts          # workspace scoping/theming hook
  src/views/*            # one component per screen
  src/modals/*           # add client/job/lead/contact, convert, sale panel, email composer
```
