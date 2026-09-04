import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

/**
 * Applies infra/sql/init.sql (+ seed.sql with --seed).
 * With --reset, drops the old catalogue tables first so the sports schema is rebuilt.
 * Multi-statement connection, used once at setup time only.
 */
const run = async () => {
  const root = path.resolve(process.cwd(), '..');
  const files = [];
  if (process.argv.includes('--reset')) files.push('infra/sql/reset-catalog.sql');
  files.push('infra/sql/init.sql');
  if (process.argv.includes('--seed')) files.push('infra/sql/seed.sql');

  const conn = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    ssl: config.mysql.ssl ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true,
  });

  for (const file of files) {
    const candidates = [path.join(root, file), path.join(process.cwd(), file), path.join('/sql', path.basename(file))];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) { console.error(`[migrate] missing ${file}`); continue; }
    await conn.query(fs.readFileSync(found, 'utf8'));
    console.log('[migrate] applied', found);
  }

  await conn.end();
  console.log('[migrate] done');
};

run().catch((err) => { console.error('[migrate] failed', err); process.exit(1); });
