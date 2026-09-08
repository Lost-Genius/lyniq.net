import assert from 'node:assert/strict';
import superjson from 'superjson';
import {db} from '../src/newsroom/helpers/db';
import {prepareResearch,createResearchDraft,getResearch} from '../src/newsroom/helpers/prepareResearch';
import {publicNews} from '../src/newsroom/helpers/publicNews';
import {publicArticle} from '../src/newsroom/helpers/publicArticle';
import {handle as admin} from '../src/newsroom/endpoints/admin_GET';
import {handle as login} from '../src/newsroom/endpoints/auth/login_with_password_POST';
import {generatePasswordHash} from '../src/newsroom/helpers/generatePasswordHash';
const timeout=setTimeout(()=>{console.error('Isolated cycle exceeded 60 seconds');process.exit(1)},60000);
async function main(){
  const user=await db.insertInto('users').values({email:'isolated@example.invalid',displayName:'Isolated editor'}).returningAll().executeTakeFirstOrThrow();
  await db.insertInto('teamMembers').values({userId:user.id,role:'editor'}).execute();
  await db.insertInto('userPasswords').values({userId:user.id,passwordHash:await generatePasswordHash('local-isolated-test-password')}).execute();
  const source=await db.insertInto('sources').values({name:'Synthetic test feed',website:'https://example.invalid',section:'Local',enabled:true,rightsNote:'Isolated synthetic test data only'}).returning('id').executeTakeFirstOrThrow();
  for(const [title,section] of [['Parliament debates transport budget funding','Local'],['Soca festival announces concert lineup','Culture'],['Cybersecurity software protects computers','Tech']] as const){
    await db.insertInto('articles').values({slug:'feed-'+section,title,section,byline:'Fixture',sourceId:source.id,sourceUrl:'https://example.invalid/'+section,status:'published',publishedAt:new Date(),excerpt:'Synthetic metadata only'}).execute();
  }
  console.log('Testing concurrent preparation'); await Promise.all([prepareResearch(),prepareResearch()]);
  const prepared=await getResearch(); assert.equal(prepared.slots.length,3); assert.ok(prepared.slots.every(s=>Array.isArray(s.packet?.sources)&&s.packet.sources.length===1),'JSON packets must round-trip as objects with source arrays');
  assert.equal((await db.selectFrom('aiDraftRuns').selectAll().execute()).length,3);
  console.log('Testing concurrent draft creation'); const [a,b]=await Promise.all([createResearchDraft('politics',user),createResearchDraft('politics',user)]);
  assert.equal(a.articleId,b.articleId);
  console.log('Draft IDs match'); const article=await db.selectFrom('articles').selectAll().where('id','=',a.articleId).executeTakeFirstOrThrow();
  assert.equal(article.status,'draft');assert.equal(article.publishedAt,null);assert.equal(article.body,'');
  assert.equal(await publicArticle(article.slug),null);
  assert.equal((await publicNews()).articles.some(x=>x.id===article.id),false);
  console.log('Draft privacy passed; testing refresh'); await prepareResearch('politics');assert.equal((await getResearch()).slots.find(s=>s.category==='politics')?.articleId,article.id);
  console.log('Testing signed login'); const session=await login(new Request('https://lyniq.net/_api/auth/login_with_password',{method:'POST',body:superjson.stringify({email:user.email,password:'local-isolated-test-password'})}));
  assert.equal(session.status,200);const cookie=session.headers.get('set-cookie')!.split(';')[0];
  const req=()=>new Request('https://lyniq.net/_api/admin',{headers:{cookie}});
  console.log('Testing editor API'); const editor=superjson.parse<any>(await (await admin(req())).text());assert.ok(editor.articles.find((x:any)=>x.id===article.id).researchMetadata);
  await db.updateTable('teamMembers').set({role:'writer'}).where('userId','=',user.id).execute();
  const writer=superjson.parse<any>(await (await admin(req())).text());
  assert.equal(writer.role,'writer');assert.equal(writer.articles.length,1);
  assert.equal('researchMetadata' in writer.articles[0],false);assert.equal('aiMetadata' in writer.articles[0],false);
  assert.deepEqual(writer.sources,[]);
  console.log('PASS: real DB concurrent preparation/draft creation, unpublished visibility, refresh preservation, signed session and editor-to-writer metadata denial.');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await db.destroy();clearTimeout(timeout)});


