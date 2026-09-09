# LYNiQ isolated PostgreSQL test environment

Step 2 established on 8 September 2026. No Step 3 migration or validation suite has run.

| Target | Production | Local test |
| --- | --- | --- |
| Neon project | lyniq (`broad-hat-04224029`) | LYNIQ-TEST-ISOLATED (`sweet-rain-17944434`) |
| Branch | production (`br-polished-boat-axqx2dre`) | test-isolated (`br-solitary-voice-ayduvani`) |
| Endpoint | ep-dark-frost-axhidjer | ep-silent-tooth-ayn2stjz |
| Host | ep-dark-frost-axhidjer.c-4.us-east-2.aws.neon.tech | ep-silent-tooth-ayn2stjz.c-5.us-east-2.aws.neon.tech |
| Database | Existing production database, untouched | lyniq_test |
| PostgreSQL | 18 | 18 |

The test project was created empty, not cloned from production. It has a separately generated password and the role `lyniq_test_owner`. Its compute is capped at 0.25 CU in the existing Free-plan organization. No plan upgrade was requested. Free-plan quotas still apply: https://neon.com/pricing.

Credentials are stored only in Git-ignored `.env.test.local`, which is also excluded from Vercel uploads by the existing `.vercelignore`. Its DATABASE_URL uses the direct test endpoint so later transaction/session-based migration checks need not use a pooler. The production URL was neither retrieved nor changed. No production data was copied or queried.

Vercel currently has one secret DATABASE_URL setting shared between Production and Preview. Preview is therefore NOT an isolated test environment. Neither Vercel environment was changed in Step 2. Use only the explicitly loaded local test configuration for the next stage; never rely on inherited DATABASE_URL or the existing preview deployment.

The connectivity checker loads `.env.test.local`, overrides any inherited URL, and checks the exact test project, host, database and role before importing the application's existing database client:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/check-test-connectivity.ts
```

It checks the database identity and absence of application tables, then creates/inserts/reads a temporary table inside an intentionally rolled-back transaction. It confirms the temporary table is absent afterward. It prints only nonsecret target identifiers. This is a Step 2 sanity check, not a migration/validation runner; its empty-database assertion will intentionally stop passing once Step 3 creates tables.

The file disables migration, validation and research preparation flags. Step 3 must explicitly load and verify this test target before selectively enabling its own test operations. Do not run the old schema-isolation harness with default or production environment values. No production deployment, environment update, migration, feed import or full research cycle is authorized by Step 2.
