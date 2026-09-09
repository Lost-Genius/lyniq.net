import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const env=parseEnv(await readFile('.env.test.local','utf8'));
const target=new URL(env.DATABASE_URL);
assert.equal(env.LYNIQ_TEST_PROJECT,'sweet-rain-17944434');
assert.equal(target.hostname,'ep-silent-tooth-ayn2stjz.c-5.us-east-2.aws.neon.tech');
assert.equal(target.pathname,'/lyniq_test');assert.equal(target.username,'lyniq_test_owner');
Object.assign(process.env,env,{NEWSROOM_RUN_MIGRATIONS:'0',NEXTAUTH_SECRET:randomBytes(32).toString('hex'),CRON_SECRET:randomBytes(32).toString('hex')});
const db=postgres(env.DATABASE_URL,{max:1,prepare:false,onnotice:()=>{},connection:{statement_timeout:30000}});
async function child(file,flags={}){
  const args=file.endsWith('.ts')?['--import','./node_modules/tsx/dist/loader.mjs',file]:[file];
  const status=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{env:{...process.env,...flags},stdio:'inherit',timeout:180000});p.on('error',reject);p.on('exit',resolve);});
  assert.equal(status,0,'Failed stage: '+file);
}
try{
  const [identity]=await db`SELECT current_database() AS database,current_user AS role`;
  assert.equal(identity.database,'lyniq_test');assert.equal(identity.role,'lyniq_test_owner');
  console.log('PASS target guard: sweet-rain-17944434 / test-isolated / lyniq_test / ep-silent-tooth-ayn2stjz');
  const base=await readFile('scripts/newsroom-schema.sql','utf8'),migration=await readFile('scripts/ai-drafts-schema.sql','utf8');
  assert.doesNotMatch(base+'\n'+migration,/\b(DROP|TRUNCATE|DELETE|RENAME|UPDATE)\b/i);
  await db.begin(tx=>tx.unsafe(base));
  await child('scripts/migrate-ai-drafts.mjs',{AI_DRAFT_MIGRATE:'1'});
  await child('scripts/migrate-ai-drafts.mjs',{AI_DRAFT_MIGRATE:'1'});
  const tables=await db`SELECT table_name FROM information_schema.tables WHERE table_schema='newsroom' ORDER BY table_name`;
  assert.deepEqual(tables.map(t=>t.table_name),['ai_draft_runs','articles','audit_log','invitations','login_attempts','sessions','sources','team_members','user_passwords','users']);
  const columns=await db`SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='newsroom' ORDER BY table_name,ordinal_position`;
  for(const [table,column] of [['articles','ai_metadata'],['articles','research_metadata'],['ai_draft_runs','research_packet']]){
    const c=columns.find(c=>c.table_name===table&&c.column_name===column);assert.equal(c?.data_type,'jsonb');assert.equal(c?.is_nullable,'YES');
  }
  for(const [table,column,pattern] of [['articles','status',/draft/],['articles','version',/^1$/],['articles','featured',/false/],['sources','enabled',/false/],['ai_draft_runs','attempts',/^1$/],['ai_draft_runs','source_urls',/\[\]/],['ai_draft_runs','status',/running/]])assert.match(columns.find(c=>c.table_name===table&&c.column_name===column)?.column_default||'',pattern);
  const indexes=await db`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='newsroom' ORDER BY indexname`;
  for(const name of ['newsroom_session_user_idx','newsroom_attempt_email_idx','newsroom_article_public_idx','newsroom_article_section_idx','articles_slug_key','articles_source_url_key','sources_name_key','ai_draft_runs_pkey'])assert.ok(indexes.some(i=>i.indexname===name),'Missing index '+name);
  const constraints=await db`SELECT c.conname,c.contype,c.convalidated,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='newsroom' ORDER BY c.conname`;
  assert.ok(constraints.every(c=>c.convalidated));
  for(const name of ['ai_draft_runs_pkey','ai_draft_runs_category_check','ai_draft_runs_status_check','ai_draft_runs_attempts_check','ai_draft_runs_article_id_fkey','articles_author_id_fkey','articles_source_id_fkey'])assert.ok(constraints.some(c=>c.conname===name),'Missing constraint '+name);
  const enums=await db`SELECT t.typname,e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='newsroom' ORDER BY t.typname,e.enumsortorder`;
  assert.deepEqual(enums.filter(e=>e.typname==='article_status').map(e=>e.enumlabel),['draft','review','scheduled','published']);
  await writeFile('docs/STEP3-SCHEMA-EVIDENCE.json',JSON.stringify({testProject:env.LYNIQ_TEST_PROJECT,tables,columns,indexes,constraints,enums},null,2)+'\n');
  console.log('PASS schema: 10 tables; metadata types/nullability, defaults, indexes, constraints and publication enum');
  await child('scripts/verify-research-isolated.mjs',{RESEARCH_VERIFY:'1'});
  await child('scripts/validate-newsroom.ts',{NEWSROOM_VALIDATE:'1'});
  await child('scripts/verify-research-cycle.ts',{DAILY_RESEARCH_ENABLED:'true'});
  await child('scripts/step3-integration.ts',{DAILY_RESEARCH_ENABLED:'true'});
  console.log('PASS Step 3 database suite; production and Vercel were not contacted');
}catch(e){console.error('Step 3 failed:',e instanceof assert.AssertionError?e.message:(e?.code||e?.name||'unknown'));process.exitCode=1;}
finally{await db.end();}
