// Fail before a Preview build can run migrations or connect application routes.
import assert from 'node:assert/strict';
import postgres from 'postgres';
if(process.env.VERCEL_ENV==='preview'){
  const target=new URL(process.env.DATABASE_URL||'');
  assert.equal(target.hostname,'ep-silent-tooth-ayn2stjz.c-5.us-east-2.aws.neon.tech','Preview must use the isolated test host');
  assert.equal(target.pathname,'/lyniq_test');assert.equal(target.username,'lyniq_test_owner');
  for(const key of ['NEWSROOM_RUN_MIGRATIONS','AI_DRAFT_MIGRATE','RESEARCH_VERIFY','NEWSROOM_VALIDATE'])assert.notEqual(process.env[key],'1','Preview migration/validation flags must be disabled');
  assert.ok(process.env.CRON_SECRET);assert.ok(process.env.NEXTAUTH_SECRET);
  const db=postgres(process.env.DATABASE_URL,{max:1,prepare:false});
  try{
    const [identity]=await db`SELECT current_database() AS database,current_user AS role`;
    assert.equal(identity.database,'lyniq_test');assert.equal(identity.role,'lyniq_test_owner');
    console.log('PASS Preview isolation: ep-silent-tooth-ayn2stjz / lyniq_test / lyniq_test_owner; migrations disabled');
  }finally{await db.end();}
}
