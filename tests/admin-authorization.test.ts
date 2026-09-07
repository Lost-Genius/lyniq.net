import {test} from 'node:test';
import assert from 'node:assert/strict';
import superjson from 'superjson';
import {writerArticleFields} from '../src/newsroom/helpers/adminArticleFields';
import {schema as saveSchema} from '../src/newsroom/endpoints/editor_POST.schema';

process.env.DATABASE_URL='postgresql://test:test@127.0.0.1:5432/test';
process.env.NEXTAUTH_SECRET='isolated-test-only';
const fixture=(id:number,authorId:number)=>({id,authorId,slug:'test-'+id,title:'Ordinary headline',excerpt:'Ordinary deck',body:'Editable original article body',section:'Local',status:'draft',sourceId:null,sourceUrl:null,byline:'Test author',featured:false,publishedAt:null,createdAt:new Date(),updatedAt:new Date(),version:1,aiMetadata:{secret:'AI-INTERNAL'},researchMetadata:{secret:'RESEARCH-INTERNAL'},researchPacket:{secret:'PACKET-INTERNAL'},sourceAnalysis:{secret:'ANALYSIS-INTERNAL'},futureOwnerOnlyField:'FUTURE-PRIVATE'});

// Deliberately returns MORE columns/rows than requested. This exercises actual
// handler serialization defensively, while assertions check SQL query scoping.
function repository(rows:ReturnType<typeof fixture>[]){
  const calls:{table:string;columns?:readonly string[];filters:unknown[][]}[]=[];
  return {calls,selectFrom(table:string){
    const call:{table:string;columns?:readonly string[];filters:unknown[][]}={table,filters:[]};calls.push(call);
    const query={select(columns:readonly string[]){call.columns=columns;return query;},selectAll(){call.columns=['*'];return query;},where(...args:unknown[]){call.filters.push(args);return query;},orderBy(){return query;},limit(){return query;},innerJoin(){return query;},async execute(){return table==='articles'?rows:table==='sources'?[{id:1,rightsNote:'Editor source analysis'}]:[{userId:7,email:'owner@example.invalid'}];}};
    return query;
  }};
}
async function harness(initialRole:'writer'|'editor'|'owner',rows=[fixture(1,7)]){
  const {createAdminHandler}=await import('../src/newsroom/endpoints/admin_GET');
  const repo=repository(rows);let role=initialRole,authorized=true;
  const authorize=async()=>{if(!authorized)throw new Error('No active session');return {id:7,email:'user@example.invalid',displayName:'User',role:'user' as const,avatarUrl:null,newsroomRole:role};};
  const handle=createAdminHandler(repo as unknown as Parameters<typeof createAdminHandler>[0],authorize);
  return {repo,setRole(value:typeof role){role=value;},revoke(){authorized=false;},async get(){const response=await handle(new Request('https://lyniq.net/_api/admin?id=2&role=owner'));return {response,text:await response.text()};}};
}
function cleanWriter(text:string){
  const data=superjson.parse<any>(text);
  assert.deepEqual(data.sources,[]);assert.deepEqual(data.members,[]);
  assert.doesNotMatch(text,/AI-INTERNAL|RESEARCH-INTERNAL|PACKET-INTERNAL|ANALYSIS-INTERNAL|FUTURE-PRIVATE|aiMetadata|researchMetadata|researchPacket|sourceAnalysis|futureOwnerOnlyField/);
  for(const article of data.articles)assert.deepEqual(Object.keys(article).sort(),[...writerArticleFields].sort());
  return data;
}
test('editor-created research article, then demotion: current writer response excludes all internal fields',async()=>{
  const h=await harness('editor');
  assert.match((await h.get()).text,/RESEARCH-INTERNAL/);
  h.setRole('writer');const result=await h.get();assert.equal(result.response.status,200);
  const data=cleanWriter(result.text);assert.equal(data.articles[0].body,'Editable original article body');
  const last=h.repo.calls.filter(c=>c.table==='articles').at(-1)!;
  assert.deepEqual(last.columns,writerArticleFields);assert.deepEqual(last.filters,[['authorId','=',7]]);
  assert.equal(result.response.headers.get('cache-control'),'no-store');
});
test('writer retains ordinary own-article fields needed for Save draft',async()=>{
  const row={...fixture(1,7),aiMetadata:null,researchMetadata:null};
  const h=await harness('writer',[row] as unknown as ReturnType<typeof fixture>[]);
  const data=cleanWriter((await h.get()).text),a=data.articles[0];
  const saved=saveSchema.parse({action:'save',...a});if(saved.action!=='save')throw new Error('Unexpected action');assert.equal(saved.body,a.body);
  assert.equal(a.id,1);assert.equal(a.version,1);
});
test('writer cannot retrieve another author’s article via ID/role query manipulation',async()=>{
  const h=await harness('writer',[fixture(1,7),fixture(2,99)]);
  const data=cleanWriter((await h.get()).text);assert.deepEqual(data.articles.map((a:any)=>a.id),[1]);
  assert.ok(h.repo.calls.every(c=>c.table==='articles'));
});
test('editor and owner retain appropriate internal research access; only owner gets team records',async()=>{
  for(const role of ['editor','owner'] as const){
    const h=await harness(role,[fixture(1,7),fixture(2,99)]),data=superjson.parse<any>((await h.get()).text);
    assert.equal(data.articles.length,2);assert.equal(data.articles[0].researchMetadata.secret,'RESEARCH-INTERNAL');
    assert.equal(data.articles[0].aiMetadata.secret,'AI-INTERNAL');assert.equal(data.sources.length,1);
    assert.equal(data.members.length,role==='owner'?1:0);
    assert.equal(data.articles[0].futureOwnerOnlyField,undefined);
  }
});
test('revoked authorization is rejected before article/source queries',async()=>{
  const h=await harness('editor');h.revoke();const result=await h.get();
  assert.equal(result.response.status,403);assert.equal(h.repo.calls.length,0);assert.doesNotMatch(result.text,/INTERNAL/);
});
test('real admin handler rejects anonymous requests without querying a database',async()=>{
  const {handle}=await import('../src/newsroom/endpoints/admin_GET');
  assert.equal((await handle(new Request('https://lyniq.net/_api/admin'))).status,403);
  const {db}=await import('../src/newsroom/helpers/db');await db.destroy();
});
