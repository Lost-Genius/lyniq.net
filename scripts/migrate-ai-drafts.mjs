import postgres from 'postgres';
import {readFile} from 'node:fs/promises';
if (process.env.AI_DRAFT_MIGRATE !== '1') process.exit(0);
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === '[SENSITIVE]') throw new Error('Real DATABASE_URL required');
const sql = postgres(process.env.DATABASE_URL, {max:1,prepare:false});
try {
  const schema = await readFile(new URL('./ai-drafts-schema.sql',import.meta.url),'utf8');
  await sql.begin(async tx => { await tx`SELECT pg_advisory_xact_lock(6170260907)`; await tx.unsafe(schema); });
  console.log('AI draft metadata and daily run ledger ready.');
} finally { await sql.end(); }
