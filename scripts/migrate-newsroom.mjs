import postgres from 'postgres';import superjson from 'superjson';import {readFile} from 'node:fs/promises';
if(process.env.NEWSROOM_RUN_MIGRATIONS!=='1'){console.log('Newsroom schema migration not requested.');process.exit(0)}
const url=process.env.DATABASE_URL;if(!url||url==='[SENSITIVE]')throw new Error('A real DATABASE_URL is required');
const sql=postgres(url,{max:1,prepare:false});
try{
const before=await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;console.log('Existing public tables preserved:',before.length);
const schema=await readFile(new URL('./newsroom-schema.sql',import.meta.url),'utf8');
await sql.begin(async tx=>{await tx`SELECT pg_advisory_xact_lock(6170260906)`;await tx.unsafe(schema);});
const r=await fetch('https://lyniq-news.floot.app/_api/news',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Floot public data export failed: '+r.status);
const data=superjson.parse(await r.text());if(!Array.isArray(data.articles)||!Array.isArray(data.sources))throw new Error('Invalid public data export');
await sql.begin(async tx=>{
for(const source of data.sources){await tx`INSERT INTO newsroom.sources(id,name,website,feed_url,section,enabled,rights_note,checked_at,last_success_at,last_error) VALUES (${source.id},${source.name},${source.website},${source.feedUrl},${source.section},${source.enabled},${source.rightsNote},${source.checkedAt},${source.lastSuccessAt},${source.lastError}) ON CONFLICT(id) DO NOTHING`;}
for(const a of data.articles){if(!a.sourceId)throw new Error('Original articles need an explicit full export; stop rather than truncate them');await tx`INSERT INTO newsroom.articles(slug,title,excerpt,section,status,source_id,source_url,byline,featured,published_at) VALUES (${a.slug},${a.title},${a.excerpt},${a.section},'published',${a.sourceId},${a.sourceUrl},${a.byline},${a.featured},${a.publishedAt}) ON CONFLICT(source_url) DO NOTHING`;}
await tx`SELECT setval('newsroom.sources_id_seq',GREATEST((SELECT COALESCE(MAX(id),1) FROM newsroom.sources),1))`;
const email=process.env.NEWSROOM_BOOTSTRAP_EMAIL,hash=process.env.NEWSROOM_BOOTSTRAP_HASH;
if(email&&hash){if(!/^[a-f0-9]{64}$/.test(hash))throw new Error('Invalid owner invitation hash');await tx`INSERT INTO newsroom.invitations(token_hash,email,role,expires_at) SELECT ${hash},${email},'owner','2026-09-13T18:14:39.094Z'::timestamptz WHERE NOT EXISTS (SELECT 1 FROM newsroom.team_members WHERE role='owner') ON CONFLICT(token_hash) DO NOTHING`;}
});
console.log('Newsroom migration complete:',data.sources.length,'sources and',data.articles.length,'public stories imported. Existing community tables unchanged.');
}finally{await sql.end()}

