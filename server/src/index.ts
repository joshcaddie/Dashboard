import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import clients from './routes/clients.js';
import contacts from './routes/contacts.js';
import jobs from './routes/jobs.js';
import sales from './routes/sales.js';
import tasks from './routes/tasks.js';
import misc from './routes/misc.js';
import ai from './routes/ai.js';
import sendEmail from './routes/email.js';
import auth from './routes/auth.js';
import users from './routes/users.js';
import importData from './routes/import.js';
import gmail from './routes/gmail.js';
import integrations from './routes/integrations.js';
import ads from './routes/ads.js';
import { attachUser, requireAuth, ensureSuperAdmin } from './auth.js';

const app = express();
// Behind Render's TLS-terminating proxy — needed for req.secure / secure cookies.
app.set('trust proxy', 1);
app.use(cors());
// 25mb accommodates base64-encoded Google Ads report uploads.
app.use(express.json({ limit: '25mb' }));
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Public auth routes (login, forgot, reset, me).
app.use('/api/auth', auth);

// Server-to-server webhooks (gated by a shared secret inside the router).
app.use('/api/integrations', integrations);

// Everything below requires a signed-in user.
app.use('/api/users', users); // (further gated to admin+ inside the router)
app.use('/api/import', importData); // (gated to super_admin inside the router)
app.use('/api/gmail', gmail); // (auth handled per-route: callback is public via signed state)
app.use('/api/clients', requireAuth, clients);
app.use('/api/contacts', requireAuth, contacts);
app.use('/api/jobs', requireAuth, jobs);
app.use('/api/sales', requireAuth, sales);
app.use('/api/tasks', requireAuth, tasks);
app.use('/api/ai', requireAuth, ai);
app.use('/api/ads', requireAuth, ads);
app.use('/api/send-email', requireAuth, sendEmail);
app.use('/api', requireAuth, misc);

// ---- Serve the built React app (single service) ----
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = process.env.CLIENT_DIST || path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: any non-/api GET returns index.html.
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  console.warn(`Client build not found at ${clientDist} — serving API only.`);
}

// Central error handler so route throws return JSON, not HTML.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err?.message || 'Internal error' });
});

const port = Number(process.env.PORT) || 4000;
ensureSuperAdmin().catch((e) => console.error('ensureSuperAdmin failed:', e?.message));
app.listen(port, () => console.log(`Schoolhub API listening on http://localhost:${port}`));
