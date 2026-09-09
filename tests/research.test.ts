import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {periodKey,canonicalUrl} from '../src/newsroom/helpers/aiDraftPolicy';
import {buildPacket,eventMatch,chatGptPrompt,publisherKey,type FeedItem} from '../src/newsroom/helpers/researchPolicy';
const now=new Date('2026-09-07T12:00:00Z');
const item=(patch:Partial<FeedItem>={}):FeedItem=>({title:'Parliament debates transport budget funding',snippet:'Transport funding was discussed, according to the feed.',url:'https://example.org/a',publication:'Publisher A',publisherKey:'a',publishedAt:'2026-09-07T10:00:00Z',section:'Local',...patch});
const second=item({title:'Transport budget funding debated in Parliament',url:'https://example.net/b',publication:'Publisher B',publisherKey:'b'});
test('Trinidad daily slots and canonical URL deduplication',()=>{
  assert.equal(periodKey(new Date('2026-09-07T03:59:00Z')),'2026-09-06');
  assert.equal(periodKey(new Date('2026-09-07T04:00:00Z')),'2026-09-07');
  assert.equal(canonicalUrl('https://www.example.org/a/?utm_source=test#top'),'https://example.org/a');
});
test('two recent publishers with similar event headlines produce ready research',()=>{
  const p=buildPacket('politics',[item(),second],[],now);
  assert.equal(p.status,'Research Ready');assert.equal(p.sources.length,2);
  assert.equal(p.sources[0].snippet,item().snippet);assert.match(p.aggregation,/No factual summary/);
  assert.equal(buildPacket('politics',[item(),second],[{topic:item().title,urls:[item().url]}],now).sources.length,0);
});
test('single local source retained; unrelated headlines do not count as corroboration',()=>{
  const other=item({title:'Government opens new hospital in Scarborough',url:'https://example.net/c',publisherKey:'b'});
  assert.equal(eventMatch(item(),other),false);
  const p=buildPacket('politics',[item(),other],[],now);
  assert.equal(p.status,'Insufficient Sources');assert.equal(p.sources.length,1);
  assert.equal(buildPacket('politics',[item({section:'World'})],[],now).sources.length,0);
});
test('stale, future and unsafe metadata cannot make research ready',()=>{
  const stale=[item(),second].map(x=>({...x,publishedAt:'2026-09-01T10:00:00Z'}));
  assert.equal(buildPacket('politics',stale,[],now).status,'Insufficient Sources');
  assert.equal(buildPacket('politics',[item({publishedAt:'2026-09-08T10:00:00Z'}),item({url:'javascript:alert(1)'})],[],now).sources.length,0);
  assert.equal(buildPacket('politics',[item({publishedAt:'2026-08-01T10:00:00Z'})],[],now).sources.length,0);
});
test('publisher grouping, duplicate headlines and possible disagreement flags',()=>{
  assert.equal(publisherKey('https://globalvoices.org/','Global Voices · Local'),publisherKey('https://globalvoices.org/','Global Voices · World'));
  const duplicate=buildPacket('politics',[item(),second,{...second,title:item().title,url:'https://example.com/c'}],[],now);
  assert.ok(duplicate.flags.some(x=>x.includes('Duplicate')));
  const disagree=buildPacket('politics',[item(),{...second,title:'Parliament rejects transport budget funding'}],[],now);
  assert.equal(disagree.status,'Insufficient Sources');assert.ok(disagree.flags.some(x=>x.includes('disagreement')));
  assert.equal(buildPacket('politics',[item(),{...second,publisherKey:'a'}],[],now).status,'Insufficient Sources');
});
test('entertainment and technology prioritize relevant regional leads',()=>{
  for(const [category,title,section] of [['entertainment','Soca festival announces concert lineup','Culture'],['technology','New cybersecurity software launches today','Tech']] as const){
    const world=item({title,url:'https://world.example/a',section});
    const local=item({title:title+' in Trinidad',url:'https://local.example/a',section:'Local'});
    const p=buildPacket(category,[world,local],[],now);
    assert.equal(p.topic,local.title);assert.ok(p.tags.includes(category));
  }
});
test('copy prompt contains attributed bounded evidence and manual safety instructions',()=>{
  const p=buildPacket('politics',[item(),second],[],now),prompt=chatGptPrompt(p);
  assert.ok(prompt.includes(item().url));assert.ok(prompt.includes(second.publication));
  assert.match(prompt,/Do not browse/);assert.match(prompt,/insufficient/);assert.match(prompt,/neutral political/);
  assert.ok(prompt.length<6500);
});
test('paid provider code removed and research engine cannot make outbound requests',()=>{
  assert.equal(existsSync('src/newsroom/helpers/aiDraftProvider.ts'),false);
  assert.equal(existsSync('src/newsroom/helpers/generateAiDrafts.ts'),false);
  const engine=readFileSync('src/newsroom/helpers/prepareResearch.ts','utf8');
  assert.doesNotMatch(engine,/\bfetch\s*\(|api\.openai|AI_DRAFT_API|researchDraft\(/);
  assert.match(engine,/pg_advisory_xact_lock/);
});
test('cron and editor endpoints reject unauthenticated requests without network access',async()=>{
  process.env.DATABASE_URL='postgresql://test:test@127.0.0.1:5432/test';process.env.NEXTAUTH_SECRET='test-only';process.env.CRON_SECRET=randomBytes(32).toString('hex');
  const {GET,POST}=await import('../src/app/api/cron/drafts/route');
  assert.equal((await GET(new Request('https://lyniq.net/api/cron/drafts'))).status,401);
  for(const authorization of ['Bearer wrong','Basic '+process.env.CRON_SECRET,'Bearer  '+process.env.CRON_SECRET,'Bearer']){
    const response=await GET(new Request('https://lyniq.net/api/cron/drafts',{headers:{authorization}}));
    assert.equal(response.status,401);assert.deepEqual(await response.json(),{error:'Unauthorised'});
  }
  assert.equal((await GET(new Request('https://lyniq.net/api/cron/drafts?view=1'))).status,403);
  assert.equal((await POST(new Request('https://lyniq.net/api/cron/drafts',{method:'POST',headers:{origin:'https://evil.example'}}))).status,403);
  const {db}=await import('../src/newsroom/helpers/db');await db.destroy();
});
