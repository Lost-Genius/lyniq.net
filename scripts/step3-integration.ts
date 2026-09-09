import assert from 'node:assert/strict';
import superjson from 'superjson';
import {sql} from 'kysely';
import {db} from '../src/newsroom/helpers/db';
import {handle as login} from '../src/newsroom/endpoints/auth/login_with_password_POST';
import {handle as edit} from '../src/newsroom/endpoints/editor_POST';
import {GET,POST} from '../src/app/api/cron/drafts/route';
import {getResearch,prepareResearch,createResearchDraft} from '../src/newsroom/helpers/prepareResearch';
import {publicArticle} from '../src/newsroom/helpers/publicArticle';
const timer=setTimeout(()=>{console.error('Step 3 integration timed out');process.exit(1)},120000);
async function main(){
  const target=new URL(process.env.DATABASE_URL!);
  assert.equal(target.hostname,'ep-silent-tooth-ayn2stjz.c-5.us-east-2.aws.neon.tech');
  assert.equal(target.pathname,'/lyniq_test');assert.equal(process.env.LYNIQ_TEST_PROJECT,'sweet-rain-17944434');
  const identity=await sql<{database:string;role:string}>`SELECT current_database() AS database,current_user AS role`.execute(db);
  assert.equal(identity.rows[0].database,'lyniq_test');assert.equal(identity.rows[0].role,'lyniq_test_owner');
  const user=await db.selectFrom('users').selectAll().where('email','=','isolated@example.invalid').executeTakeFirstOrThrow();
  await db.updateTable('teamMembers').set({role:'owner'}).where('userId','=',user.id).execute();
  const session=await login(new Request('https://lyniq.net/_api/auth/login_with_password',{method:'POST',body:superjson.stringify({email:user.email,password:'local-isolated-test-password'})}));
  assert.equal(session.status,200);const cookie=session.headers.get('set-cookie')!.split(';')[0];
  const request=(data:unknown)=>new Request('https://lyniq.net/_api/editor',{method:'POST',headers:{cookie,origin:'https://lyniq.net'},body:superjson.stringify(data)});
  const draft={action:'save',title:'TEST Step 3 editorial workflow',excerpt:'Synthetic test only',body:'This is synthetic test content for validating the isolated editorial workflow.',section:'Local',status:'draft',publishedAt:null,featured:false};
  assert.equal((await edit(request(draft))).status,200);
  let article=await db.selectFrom('articles').selectAll().where('title','=',draft.title).executeTakeFirstOrThrow();
  assert.equal(await publicArticle(article.slug),null);
  for(const status of ['review','published']){
    assert.equal((await edit(request({...draft,id:article.id,version:article.version,status,excerpt:'TEST updated deck'}))).status,200);
    article=await db.selectFrom('articles').selectAll().where('id','=',article.id).executeTakeFirstOrThrow();
    assert.equal(article.status,status);assert.equal(article.excerpt,'TEST updated deck');
    assert.equal(Boolean(await publicArticle(article.slug)),status==='published');
  }
  console.log('PASS article create/update/review/publish through authorized controls');

  const cron=(header?:string)=>GET(new Request('https://lyniq.net/api/cron/drafts',{headers:header?{authorization:header}:{}}));
  const snapshot=()=>db.selectFrom('aiDraftRuns').selectAll().orderBy('category').execute();
  const before=await snapshot();
  for(const header of [undefined,'Bearer wrong','Basic '+process.env.CRON_SECRET,'Bearer  '+process.env.CRON_SECRET]){
    const r=await cron(header);assert.equal(r.status,401);assert.deepEqual(await r.json(),{error:'Unauthorised'});
  }
  assert.deepEqual(await snapshot(),before);
  const results=await Promise.all(Array.from({length:6},()=>cron('Bearer '+process.env.CRON_SECRET)));
  assert.ok(results.every(r=>r.status===200));assert.deepEqual(await snapshot(),before);
  assert.equal((await getResearch()).slots.length,3);
  console.log('PASS real cron authorization and six concurrent idempotent invocations');

  const source=await db.selectFrom('sources').selectAll().where('name','=','Synthetic test feed').executeTakeFirstOrThrow();
  const feed=await db.selectFrom('articles').selectAll().where('slug','=','feed-Culture').executeTakeFirstOrThrow();
  const duplicate={slug:'test-step3-canonical-duplicate',title:feed.title,excerpt:feed.excerpt,section:feed.section,status:'published' as const,publishedAt:feed.publishedAt,byline:'TEST fixture',sourceId:source.id,sourceUrl:feed.sourceUrl+'?utm_source=test'};
  await db.insertInto('articles').values(duplicate).execute();
  const malformed=await db.insertInto('sources').values({name:'TEST malformed source',website:'not-a-url',section:'Culture',enabled:true,rightsNote:'Synthetic TEST fixture; no network requests or licensed source changes'}).returning('id').executeTakeFirstOrThrow();
  await db.insertInto('articles').values({...duplicate,slug:'test-step3-malformed',sourceId:malformed.id,sourceUrl:'javascript:invalid'}).execute();
  let packet=(await prepareResearch('entertainment')).slots.find(s=>s.category==='entertainment')!.packet!;
  assert.equal(packet.sources.length,1);assert.equal(packet.status,'Insufficient Sources');
  assert.ok(packet.sources.every(s=>s.url.startsWith('https://')));
  await assert.rejects(db.insertInto('sources').values({name:source.name,website:source.website,section:'Local',rightsNote:'TEST duplicate source'}).execute(),{code:'23505'});
  await assert.rejects(db.insertInto('articles').values(duplicate).execute(),{code:'23505'});
  await assert.rejects(db.insertInto('articles').values({...duplicate,slug:'test-step3-duplicate-url'}).execute(),{code:'23505'});
  await assert.rejects(db.insertInto('aiDraftRuns').values({period:'TEST',category:'invalid'}).execute(),{code:'23514'});
  await assert.rejects(db.insertInto('aiDraftRuns').values({period:'TEST',category:'politics',attempts:3}).execute(),{code:'23514'});
  await assert.rejects(db.insertInto('aiDraftRuns').values({period:'TEST',category:'politics',status:'invalid'}).execute(),{code:'23514'});
  await assert.rejects(db.insertInto('aiDraftRuns').values({period:'TEST',category:'politics',articleId:2147483647}).execute(),{code:'23503'});
  console.log('PASS canonical deduplication, malformed metadata rejection, unique/CHECK/foreign-key enforcement');

  await db.updateTable('sources').set({enabled:false}).where('id','=',source.id).execute();
  packet=(await prepareResearch('entertainment')).slots.find(s=>s.category==='entertainment')!.packet!;
  assert.equal(packet.sources.length,0);assert.equal(packet.status,'Insufficient Sources');
  const countBefore=(await db.selectFrom('articles').select('id').execute()).length;
  await assert.rejects(createResearchDraft('entertainment',user));
  assert.equal((await db.selectFrom('articles').select('id').execute()).length,countBefore);
  assert.equal((await getResearch()).slots.find(s=>s.category==='entertainment')!.articleId,null);
  await db.updateTable('sources').set({enabled:true}).where('id','=',source.id).execute();
  await prepareResearch('entertainment');
  console.log('PASS zero eligible sources: explicit insufficiency and no partial draft');

  const beforeFailure=await snapshot();
  // Force a write failure after the packet update, confined to this test database.
  await sql`ALTER TABLE newsroom.audit_log ADD CONSTRAINT step3_test_failure CHECK (action NOT LIKE 'research:refresh:%') NOT VALID`.execute(db);
  try{
    const r=await POST(new Request('https://lyniq.net/api/cron/drafts',{method:'POST',headers:{cookie,origin:'https://lyniq.net','content-type':'application/json'},body:JSON.stringify({action:'refresh',category:'entertainment'})}));
    assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'Research action failed. Check that the migration is applied and the packet has sources.'});
    assert.deepEqual(await snapshot(),beforeFailure,'Failed audit insertion must roll back packet changes');
  }finally{await sql`ALTER TABLE newsroom.audit_log DROP CONSTRAINT step3_test_failure`.execute(db);}
  await assert.rejects(db.transaction().execute(async trx=>{
    await trx.insertInto('articles').values({...duplicate,slug:'test-step3-rollback-marker',sourceUrl:null}).execute();
    await trx.insertInto('articles').values(duplicate).execute();
  }),{code:'23505'});
  assert.equal((await db.selectFrom('articles').select('id').where('slug','=','test-step3-rollback-marker').execute()).length,0);
  await prepareResearch('entertainment');
  console.log('PASS injected database failure: generic API failure, atomic rollback, recovery');

  // Remove deliberately malformed and duplicate fixtures; retain useful labelled test data.
  await db.deleteFrom('articles').where('slug','in',['test-step3-malformed','test-step3-canonical-duplicate']).execute();
  await db.deleteFrom('sources').where('id','=',malformed.id).execute();
  const integrity=await sql<{bad:number}>`
    SELECT (
      (SELECT count(*) FROM newsroom.ai_draft_runs r LEFT JOIN newsroom.articles a ON a.id=r.article_id WHERE r.article_id IS NOT NULL AND a.id IS NULL) +
      (SELECT count(*) FROM newsroom.articles WHERE research_metadata IS NOT NULL AND (status<>'draft' OR published_at IS NOT NULL OR jsonb_typeof(research_metadata)<>'object')) +
      (SELECT count(*) FROM newsroom.ai_draft_runs WHERE status<>'completed' OR jsonb_typeof(research_packet)<>'object') +
      (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='newsroom' AND NOT c.convalidated)
    )::int AS bad`.execute(db);
  assert.equal(integrity.rows[0].bad,0);assert.equal((await snapshot()).length,3);
  console.log('PASS final integrity: three unique packets, valid references/JSON, unpublished research draft, no residual failure constraint');
}
main().catch(e=>{console.error('Integration failure:',e instanceof assert.AssertionError?e.message:(e?.code||e?.name));process.exitCode=1;}).finally(async()=>{await db.destroy();clearTimeout(timer)});
