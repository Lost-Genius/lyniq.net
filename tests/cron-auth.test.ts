import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {researchCron} from '../src/newsroom/helpers/researchCron';

test('research cron authorizes before dispatch and fails closed without leaking details',async t=>{
  const previous=process.env.CRON_SECRET;
  const secret=randomBytes(32).toString('hex');
  const request=(authorization?:string)=>new Request('https://lyniq.net/api/cron/drafts',{
    headers:authorization===undefined?{}:{authorization},
  });
  let calls=0;
  const prepare=async()=>{calls++;return {enabled:true,slots:[]};};
  try {
    process.env.CRON_SECRET=secret;
    for(const [name,value] of [
      ['missing',undefined],['empty',''],['wrong same length','Bearer '+('0'+secret.slice(1)).replace(/^Bearer /,'')],
      ['wrong short','Bearer wrong'],['missing scheme',secret],['wrong scheme','Basic '+secret],
      ['missing token','Bearer'],['extra spacing','Bearer  '+secret],['tab separator','Bearer\t'+secret],
      ['duplicate credentials','Bearer '+secret+', Bearer '+secret],['extra token','Bearer '+secret+' extra'],
    ] as const){
      // Ensure the equal-length wrong value cannot accidentally equal the random secret.
      const header=name==='wrong same length'?'Bearer '+(secret[0]==='0'?'1':'0')+secret.slice(1):value;
      await t.test('rejects '+name,async()=>{
        const r=await researchCron(request(header),prepare);
        assert.equal(r.status,401);assert.deepEqual(await r.json(),{error:'Unauthorised'});
        assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(calls,0);
      });
    }
    await t.test('missing and empty environment secret deny even a formerly valid credential',async()=>{
      for(const value of [undefined,'']){
        if(value===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=value;
        const r=await researchCron(request('Bearer '+secret),prepare);
        assert.equal(r.status,401);assert.deepEqual(await r.json(),{error:'Unauthorised'});assert.equal(calls,0);
      }
    });
    process.env.CRON_SECRET=secret;
    await t.test('exact bearer credential executes preparation once',async()=>{
      const r=await researchCron(request('Bearer '+secret),prepare);
      assert.equal(r.status,200);assert.deepEqual(await r.json(),{enabled:true,slots:[]});assert.equal(calls,1);
    });
    await t.test('authenticated preparation failures return only a generic error',async()=>{
      const r=await researchCron(request('Bearer '+secret),async()=>{throw new Error('database credentials '+secret);});
      assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'Research preparation unavailable'});
    });
  }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});
