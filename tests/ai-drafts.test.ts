import {test} from 'node:test';
import assert from 'node:assert/strict';
import {periodKey,canonicalUrl,sourcePolicy,validateDraft,sameStory} from '../src/newsroom/helpers/aiDraftPolicy';
import {providerConfig,researchDraft} from '../src/newsroom/helpers/aiDraftProvider';
const now=new Date('2026-09-07T12:00:00Z'), policy=sourcePolicy({});
const urls=['https://newsday.co.tt/2026/09/07/story','https://www.guardian.co.tt/news/story'];
const valid={sufficientEvidence:true,reason:'',headline:'A supported current development',deck:'A short deck',body:'Original test article text. '.repeat(40),topic:'parliament budget debate transport funding',localRelevance:true,tags:['politics'],sources:urls.map(url=>({url,publishedAt:'2026-09-07T10:00:00Z',facts:['A factual note for review']}))};
test('Trinidad day boundary and tracking URL normalization',()=>{
  assert.equal(periodKey(new Date('2026-09-07T03:59:00Z')),'2026-09-06');
  assert.equal(periodKey(new Date('2026-09-07T04:00:00Z')),'2026-09-07');
  assert.equal(canonicalUrl('https://www.newsday.co.tt/story/?utm_source=test#x'),'https://newsday.co.tt/story');
});
test('requires current observed evidence from distinct approved publishers',()=>{
  assert.equal(validateDraft(valid,urls,'politics',policy,now).sources.length,2);
  assert.throws(()=>validateDraft(valid,[urls[0]],'politics',policy,now),/research evidence/);
  assert.throws(()=>validateDraft({...valid,sufficientEvidence:false},urls,'politics',policy,now),/Insufficient/);
  assert.throws(()=>validateDraft({...valid,localRelevance:false},urls,'politics',policy,now),/Trinidad/);
  assert.throws(()=>validateDraft({...valid,sources:valid.sources.map(s=>({...s,publishedAt:'2026-08-01T10:00:00Z'}))},urls,'politics',policy,now),/72-hour/);
  assert.throws(()=>validateDraft({...valid,sources:[valid.sources[0],valid.sources[0]]},urls,'politics',policy,now),/distinct/);
  assert.throws(()=>validateDraft(valid,urls,'politics',{...policy,blocked:['newsday.co.tt']},now),/Restricted/);
  assert.throws(()=>validateDraft({...valid,sources:valid.sources.map(s=>({...s,url:'https://evilnewsday.co.tt/story'}))},['https://evilnewsday.co.tt/story'],'politics',policy,now),/Unapproved/);
});
test('detects reused URLs and substantially overlapping events',()=>{
  assert.ok(sameStory({topic:valid.topic,urls:[]},{topic:'transport funding parliament budget debate',urls:[]}));
  assert.ok(sameStory({topic:'different',urls:[urls[0]]},{topic:'another',urls:[urls[0]]}));
  assert.equal(sameStory({topic:'budget debate',urls:[]},{topic:'music concert festival',urls:[]}),false);
});
test('disabled by default and credentials required before enabling',()=>{
  assert.equal(providerConfig({}),null);
  assert.throws(()=>providerConfig({AI_DRAFT_ENABLED:'true'}),/AI_DRAFT_API_KEY/);
  assert.throws(()=>providerConfig({AI_DRAFT_ENABLED:'true',AI_DRAFT_API_KEY:'test',AI_DRAFT_MODEL:'test',AI_DRAFT_API_URL:'http://localhost'}),/HTTPS/);
});
test('one bounded provider request, no automatic retries; validates output evidence',async()=>{
  let calls=0;
  const config={provider:'openai',endpoint:'https://api.openai.com/v1/responses',key:'test-not-a-key',model:'configured-model'};
  const fake:typeof fetch=async(_url,init)=>{
    calls++;const body=JSON.parse(String(init?.body));
    assert.equal(body.max_tool_calls,3); assert.equal(body.max_output_tokens,3200); assert.equal(body.store,false);
    assert.equal(body.model,'configured-model'); assert.ok(body.tools[0].filters.allowed_domains.includes('newsday.co.tt'));
    return Response.json({status:'completed',output:[{type:'web_search_call',action:{sources:urls.map(url=>({url}))}},{type:'message',content:[{type:'output_text',text:JSON.stringify(valid)}]}]});
  };
  const result=await researchDraft('politics',[],policy,config,now,fake);
  assert.equal(calls,1);assert.equal(result.evidence.length,2);
  calls=0;
  await assert.rejects(()=>researchDraft('politics',[],policy,config,now,async()=>{calls++;return new Response('',{status:429});}),/429/);
  assert.equal(calls,1);
  await assert.rejects(()=>researchDraft('politics',[],policy,config,now,async()=>Response.json({status:'incomplete'})),/incomplete/);
});
