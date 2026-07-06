// Runs the API server and the Vite dev server together (no extra deps).
import { spawn } from 'node:child_process';

const procs = [
  spawn('npm', ['--prefix', 'server', 'run', 'dev'], { stdio: 'inherit', shell: process.platform === 'win32' }),
  spawn('npm', ['--prefix', 'client', 'run', 'dev'], { stdio: 'inherit', shell: process.platform === 'win32' }),
];

const shutdown = () => { procs.forEach((p) => p.kill('SIGINT')); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
procs.forEach((p) => p.on('exit', (code) => { if (code) { shutdown(); } }));
