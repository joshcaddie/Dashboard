# Deploying Schoolhub CRM (Render + Neon, free tier)

The app ships as a **single Render web service** that serves the API and the built React
app, with data in a **Neon Postgres** database so it survives restarts.

## One-time setup

### 1. Database — Neon
1. In your Neon project, open **Connection string**.
2. Turn **OFF "Pooled connection"** (the direct string is more reliable for the
   schema-create step Prisma runs on boot).
3. Copy it — it looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require
   ```

### 2. Host — Render
1. **New → Blueprint** and pick this GitHub repo. Render reads `render.yaml` and configures
   the service (build `npm run render-build`, start `npm run start`, health `/api/health`,
   free plan) automatically.
2. Set the environment variables when prompted:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon direct connection string from step 1 |
   | `ANTHROPIC_API_KEY` | *(optional)* your Anthropic key — enables real AI email drafting |
   | `SMTP2GO_API_KEY_SCHOOLWEBSITES` | SMTP2GO key sending from `joshua@websites.school.nz` (also used for auth emails) |
   | `SMTP2GO_API_KEY_CADDIE` | SMTP2GO key sending from `josh@caddiedigital.co.nz` |
   | `SUPERADMIN_INITIAL_PASSWORD` | *(optional)* set a starting password for the super admin — see below |
   | `JWT_SECRET` | *(optional)* signs login sessions; if unset, a stable secret is derived from `DATABASE_URL` |
   | `APP_URL` | *(optional)* base URL used in invite/reset links; if unset, derived from the request |
3. **Apply / Deploy.**

On first boot the server creates the tables and seeds the sample data — **only when the
database is empty**, so redeploys never wipe your data. Render gives you a public
`https://<name>.onrender.com` URL.

### 3. First sign-in (super admin)
The dashboard is locked behind a login. On boot the server ensures a **super admin** account
exists for **Joshua Woodham — `joshua@websites.school.nz`**. To set its password:

- **Recommended (no secrets in env):** go to the live URL, click **Forgot password?**, enter
  `joshua@websites.school.nz`, and follow the emailed link to set a password. (This needs
  `SMTP2GO_API_KEY_SCHOOLWEBSITES` to be set.)
- **Or:** set `SUPERADMIN_INITIAL_PASSWORD` in Render, deploy, and sign in with it. You can
  delete that variable afterwards — the password is stored (hashed) in the database.

Once in, invite the rest of the team from **Settings → Team members** (roles: super admin /
admin / team member). Invitees get an email link to set their own password.

> **Free-tier note:** the service sleeps after ~15 min idle and takes ~30–60s to wake on the
> next request. A ~$7/mo Render instance removes that if you want always-on.

## Ongoing workflow (no tokens)

- Render **auto-deploys on every push to `main`** — it pulls from GitHub itself, so deploys
  never need a token.
- To make code changes without pasting a token, run Claude Code sessions **connected to this
  GitHub repo** (claude.ai/code with GitHub connected, or the Claude GitHub app). Those
  sessions push through the managed connection.

Flow: **edit → push to `main` → Render auto-deploys.**

## Troubleshooting

- **Build fails on Node version** — `render.yaml` pins `NODE_VERSION=22`; keep it.
- **`prisma db push` errors about prepared statements** — you're using Neon's *pooled*
  connection string. Use the **direct** (non-pooled) one for `DATABASE_URL`.
- **App loads but data calls fail** — check the Render logs; almost always a missing or
  wrong `DATABASE_URL`.
- **AI email says "Could not generate"** — no `ANTHROPIC_API_KEY` set (the app still works
  via the local fallback draft).
- **"Forgot password" email never arrives** — `SMTP2GO_API_KEY_SCHOOLWEBSITES` isn't set (auth
  emails send from `joshua@websites.school.nz`). Check the Render logs for a mail error, or set
  `SUPERADMIN_INITIAL_PASSWORD` instead for the first sign-in.
- **Signed out unexpectedly after a redeploy** — set a fixed `JWT_SECRET` so sessions survive
  even if `DATABASE_URL` changes.
