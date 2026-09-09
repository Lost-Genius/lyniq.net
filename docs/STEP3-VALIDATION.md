# Step 3 validation record

Database suite completed 8 September 2026; remaining local checks completed 9 September 2026. Step 4 has not started.

## Target and safety

All database-backed checks used only project `sweet-rain-17944434`, branch `test-isolated`, database `lyniq_test`, role `lyniq_test_owner`, direct endpoint `ep-silent-tooth-ayn2stjz.c-5.us-east-2.aws.neon.tech`. The runner validates these identifiers before schema changes. No production or Vercel connections were made. Local builds override DATABASE_URL with a dummy localhost target.

## Results

- Applied `newsroom-schema.sql` and `ai-drafts-schema.sql` in the test database. Repeated research migration succeeded. Notices about existing columns/tables are expected from IF NOT EXISTS.
- Verified 10 tables, JSONB metadata columns/nullability, key defaults, expected indexes, validated constraints and publication states. Full nonsecret catalog snapshot: `STEP3-SCHEMA-EVIDENCE.json`.
- Both prior-AI-migration scenarios passed in disposable schemas within this same isolated test database. Existing sentinel article fields and historical AI metadata survived repeat migration. Disposable schemas and local copies were removed.
- Existing newsroom validation and research-cycle scripts passed, including invitation binding/replay, sessions, CSRF, writer restrictions, stale edits, scheduled visibility, concurrent packet/draft creation, draft privacy and role downgrade.
- Extended integration passed: article creation/edit/review/publish through authorized controls; real cron accepted/rejected credentials; six concurrent cron invocations; canonical source deduplication; malformed metadata handling; source/article uniqueness; CHECK/foreign-key rejection; zero eligible sources; failure without partial draft; injected database-write failure with atomic rollback and recovery.
- Final integrity check passed: three unique research packets, valid references/JSON, unpublished research draft, no residual failure constraint or rollback marker. Useful synthetic fixtures remain; malformed/duplicate fixtures were removed.
- All 30 local research, cron-auth and admin-authorization tests passed. Type check, local production build and Git diff whitespace checks passed.

## Changes and limits

Added guarded Step 3 orchestration/integration scripts and evidence. Fixed a Windows-only test harness loader path with pathToFileURL; no application workflow changes were needed in Step 3. Earlier Step 1 favicon/auth changes remain pending locally.

The retained fixtures are test data (`isolated@example.invalid`, Synthetic test feed, Fixture/TEST bylines and TEST article titles). The initial fixture scripts expect a fresh fixture set: do not blindly rerun the entire orchestrator on retained fixtures. Prepare a fresh isolated test branch/schema or explicitly clean only these test fixtures first. Never use Vercel Preview for tests until Step 4 replaces its currently shared production database configuration.

Verdict: STEP 3 MIGRATION/VALIDATION TESTING: PASS. Ready for Step 4, subject to explicit authorization. No deployment has occurred.
