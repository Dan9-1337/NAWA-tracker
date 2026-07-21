#!/usr/bin/env node
/**
 * Local SPA + API without Vercel login.
 * Requires .env.local (npm run local:env) and a running database.
 *
 * Usage: node scripts/local-dev.mjs
 */
import { spawn } from 'node:child_process';
import { accessSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const envFile = resolve(root, '.env.local');

try {
  accessSync(envFile);
} catch {
  console.error('Missing .env.local. Create it first:\n  npm run db:start && npm run local:env\n');
  process.exit(1);
}

function parseEnvFile(path) {
  const values = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const fileEnv = parseEnvFile(envFile);
if (!fileEnv.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is missing from .env.local. Run: npm run local:env\n');
  process.exit(1);
}
if (!fileEnv.VITE_TELEGRAM_DEV_INIT_DATA) {
  console.error('VITE_TELEGRAM_DEV_INIT_DATA is missing from .env.local. Run: npm run local:env\n');
  process.exit(1);
}

const children = [];
const childEnv = {
  ...process.env,
  ...fileEnv,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};

function shutDown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => shutDown(0));
process.on('SIGTERM', () => shutDown(0));

function start(command, args, label) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: childEnv,
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      shutDown(1);
      return;
    }
    if (code && code !== 0) {
      console.error(`${label} exited with code ${code}`);
      shutDown(code);
    }
  });
  children.push(child);
  return child;
}

start(
  process.execPath,
  ['--env-file=.env.local', resolve(root, 'node_modules/vite-node/vite-node.mjs'), 'scripts/local-api-server.ts'],
  'API',
);

start(
  process.execPath,
  [resolve(root, 'node_modules/vite/bin/vite.js'), '--port', '3000', '--strictPort'],
  'Vite',
);

console.log('Local app: http://localhost:3000');
console.log('Uses signed dev initData for demo Telegram user 900000001 (see supabase/seed.sql).');
