// Step 2 only: no migrations, fixtures, or newsroom validation are executed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {sql} from 'kysely';

async function main(){
  const env=parseEnv(readFileSync('.env.test.local','utf8'));
  assert.ok(env.DATABASE_URL,'Test DATABASE_URL is required');
  const target=new URL(env.DATABASE_URL);
  assert.equal(env.LYNIQ_TEST_PROJECT,'sweet-rain-17944434');
  assert.ok(['ep-silent-tooth-ayn2stjz.c-5.us-east-2.aws.neon.tech','ep-silent-tooth-ayn2stjz-pooler.c-5.us-east-2.aws.neon.tech'].includes(target.hostname));
  assert.equal(target.pathname,'/lyniq_test');
  assert.equal(target.username,'lyniq_test_owner');
  assert.ok(target.password);
  // Override inherited values before importing the actual application client.
  Object.assign(process.env,env);
  const {db}=await import('../src/newsroom/helpers/db');
  try{
    const {rows:[identity]}=await sql<{database:string;role:string;version:string;tables:number}>`
      SELECT current_database() AS database, current_user AS role,
        current_setting('server_version') AS version,
        (SELECT count(*)::int FROM information_schema.tables
         WHERE table_schema NOT IN ('pg_catalog','information_schema')) AS tables
    `.execute(db);
    assert.equal(identity.database,'lyniq_test');assert.equal(identity.role,'lyniq_test_owner');
    assert.equal(identity.tables,0,'Test environment must still be empty before Step 3');
    const rollback=new Error('Intentional sanity-check rollback');
    await assert.rejects(db.transaction().execute(async trx=>{
      await sql`CREATE TEMP TABLE lyniq_test_connectivity(value integer) ON COMMIT DROP`.execute(trx);
      await sql`INSERT INTO lyniq_test_connectivity VALUES (1)`.execute(trx);
      const result=await sql<{value:number}>`SELECT value FROM lyniq_test_connectivity`.execute(trx);
      assert.equal(result.rows[0].value,1);
      throw rollback;
    }),error=>error===rollback);
    const {rows:[after]}=await sql<{absent:boolean}>`SELECT to_regclass('pg_temp.lyniq_test_connectivity') IS NULL AS absent`.execute(db);
    assert.equal(after.absent,true);
    console.log(JSON.stringify({result:'PASS',project:env.LYNIQ_TEST_PROJECT,host:target.hostname,...identity,temporaryWriteRolledBack:true,migrationsRun:false}));
  }finally{await db.destroy();}
}
main().catch(()=>{console.error('Isolated connectivity check FAILED. Credentials and database error details suppressed.');process.exitCode=1;});
