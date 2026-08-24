// class-validator/class-transformer decorators need the metadata polyfill
// before any DTO module is imported.
import 'reflect-metadata';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Loads `.env` into `process.env` for tests.
 *
 * Integration specs talk to a real PostgreSQL, so `DATABASE_URL` has to be
 * present before Prisma is constructed. Written by hand rather than pulling in
 * dotenv, since this is the only place the API needs it outside Nest's
 * ConfigModule.
 */
for (const file of ['.env.test', '.env.local', '.env']) {
  const path = join(__dirname, '..', file);
  if (!existsSync(path)) continue;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] !== undefined) continue; // earlier files win

    const raw = trimmed.slice(separator + 1).trim();
    process.env[key] = raw.replace(/^["']|["']$/g, '');
  }
}
