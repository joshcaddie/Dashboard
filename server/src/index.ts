import express from 'express';
import cors from 'cors';
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

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/clients', clients);
app.use('/api/contacts', contacts);
app.use('/api/jobs', jobs);
app.use('/api/sales', sales);
app.use('/api/tasks', tasks);
app.use('/api/ai', ai);
app.use('/api', misc);

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
app.listen(port, () => console.log(`Schoolhub API listening on http://localhost:${port}`));
