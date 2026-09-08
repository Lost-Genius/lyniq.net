// Opt-in pre-deployment checks. Production newsroom/public tables are never changed.
import postgres from 'postgres';
import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
if(process.env.RESEARCH_VERIFY!=='1')process.exit(0);
const sql=postgres(process.env.DATABASE_URL,{max:1,prepare:false,onnotice:()=>{},connection:{statement_timeout:30000}});
const root=resolve('.'), temp=join(root,'.research-verification-'+randomBytes(6).toString('hex'));
try{
  await mkdir(join(temp,'scripts'),{recursive:true});
  await cp(join(root,'src/newsroom'),join(temp,'src/newsroom'),{recursive:true});
  await cp(join(root,'scripts/validate-newsroom.ts'),join(temp,'scripts/validate-newsroom.ts'));
  await cp(join(root,'scripts/verify-research-cycle.ts'),join(temp,'scripts/verify-research-cycle.ts'));
  const originalDb=await readFile(join(root,'src/newsroom/helpers/db.tsx'),'utf8');
  assert.ok(originalDb.includes('.withSchema("newsroom")'));
  const base=await readFile('scripts/newsroom-schema.sql','utf8'),migration=await readFile('scripts/ai-drafts-schema.sql','utf8');
  for(const previous of [false,true]){
    const schema='verify_research_'+randomBytes(8).toString('hex');
    const qualify=s=>s.replace(/\bnewsroom\b/g,schema);
    try{
      await sql.unsafe(qualify(base));
      if(previous)await sql.unsafe(qualify(migration.split('ALTER TABLE newsroom.ai_draft_runs ADD COLUMN')[0]));
      await sql.unsafe(`INSERT INTO ${schema}.articles(slug,title,body,byline,section,status) VALUES ('preserve','Preserve original','Existing text','Original author','Local','draft')`);
      if(previous)await sql.unsafe(`UPDATE ${schema}.articles SET ai_metadata='{"legacy":"preserve"}'::jsonb WHERE slug='preserve'`);
      const before=await sql.unsafe(`SELECT title,body,byline,status FROM ${schema}.articles WHERE slug='preserve'`);
      await sql.unsafe(qualify(migration));await sql.unsafe(qualify(migration));
      assert.deepEqual(await sql.unsafe(`SELECT title,body,byline,status FROM ${schema}.articles WHERE slug='preserve'`),before);
      if(previous)assert.equal((await sql.unsafe(`SELECT ai_metadata FROM ${schema}.articles WHERE slug='preserve'`))[0].ai_metadata.legacy,'preserve');
      await writeFile(join(temp,'src/newsroom/helpers/db.tsx'),originalDb.replace('max: 3,','max: 3, connection: { statement_timeout: 30000 },').replace('.withSchema("newsroom")',`.withSchema("${schema}")`));
      for(const file of ['validate-newsroom.ts','verify-research-cycle.ts']){
        console.log('Running isolated check:',file); const status=await new Promise((done,fail)=>{const child=spawn(process.execPath,['--import',join(root,'node_modules/tsx/dist/loader.mjs'),join(temp,'scripts',file)],{cwd:root,env:{...process.env,NEWSROOM_VALIDATE:'1',DAILY_RESEARCH_ENABLED:'true'},stdio:'inherit',timeout:120000});child.on('error',fail);child.on('exit',done);});
        if(status!==0)throw new Error('Isolated verification failed: '+file);
      }
      console.log('PASS: additive/repeated migration and isolated API/research cycle; prior AI migration:',previous);
    }finally{
      if(!/^verify_research_[a-f0-9]{16}$/.test(schema))throw new Error('Unsafe test schema');
      await sql.unsafe(`DROP SCHEMA "${schema}" CASCADE`);
    }
  }
}finally{
  await sql.end();
  if(temp.startsWith(root+sep)&&temp.includes('.research-verification-'))await rm(temp,{recursive:true,force:true});
}
