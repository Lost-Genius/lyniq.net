# Daily AI drafts

This feature adds three daily draft slots to the existing newsroom: politics/current affairs → Local, entertainment → Culture, technology → Tech. It never publishes or schedules articles. Existing editors/owners review and publish through the existing article editor. AI metadata, suggested tags, source facts and links appear only in the authenticated editor; they are excluded from public article responses. Keep relevant attribution in the body when publishing.

## Activation

1. Apply the additive migration with a real server-side `DATABASE_URL`: set `AI_DRAFT_MIGRATE=1` and run `node scripts/migrate-ai-drafts.mjs`. On Vercel, a preview deployment with `--build-env AI_DRAFT_MIGRATE=1` runs it before building. Do not enable the old Floot migration. Preview and production currently share the same database; this migration only adds a nullable metadata column and a run ledger.
2. Configure server-only Vercel environment variables:
   - `AI_DRAFT_API_KEY`: a separately billed API key. Never use a NEXT_PUBLIC variable or commit it.
   - `AI_DRAFT_MODEL`: a model supporting Responses web_search and strict JSON-schema output. No model is silently selected.
   - `AI_DRAFT_ENABLED=true`: explicit cost switch; otherwise no provider calls or run slots are created.
   - Existing `CRON_SECRET` and `DATABASE_URL` are reused.
3. Deploy the feature after migration. Redeploy when Vercel environment variables change.

Optional: `AI_DRAFT_PROVIDER=openai` (default) or `responses-compatible`; `AI_DRAFT_API_URL` defaults to https://api.openai.com/v1/responses. Alternate providers must implement the same Responses, web-search evidence and structured-output contract; this is not a generic chat-completions adapter. Verify provider capabilities before activation.

## Schedule and manual test

`vercel.json` adds `/api/cron/drafts` daily at `30 10 * * *` (06:30 Trinidad time, subject to Vercel Hobby scheduling precision). The existing feed import cron is unchanged. Change this one cron expression to change timing; idempotency remains one slot per category per Trinidad day.

Sign in as an editor/owner, open Articles and choose **Generate today’s 3 AI drafts**. This is one real, paid cycle using the same date slots as cron. Repeat clicks return existing slot status without charging again. **Retry failed slots once** allows one additional attempt for failed slots only; completed/running slots are never regenerated. Writers cannot trigger either action. The cron GET uses the existing bearer CRON_SECRET. Do not put it in a URL.

## Source and cost controls

One provider request per category, at most three web-search tool calls and 3,200 output tokens per request; no automatic API retries. Categories run concurrently within a 300-second Vercel function, with a 170-second timeout per provider request. Normally three provider requests/day; explicit failed-slot retries allow at most six. Provider spend limits are still recommended: token/tool limits are not a currency cap.

Edit the small source list in `aiDraftPolicy.ts`, or set `AI_DRAFT_SOURCES_JSON` to JSON pairs of `[domain, publication]`. Use the same publication name for domains belonging to one newsroom so they cannot count twice. `AI_DRAFT_BLOCKED_DOMAINS` is a comma-separated denylist taking precedence. Research approval is distinct from the existing RSS republication permissions; no paused feed is enabled by this feature.

Every accepted draft must cite observed research URLs from at least two approved publishers within the last 72 hours. Politics requires Trinidad & Tobago relevance. Source URLs and overlapping event descriptions are checked against the prior seven days and other categories before saving. An unavailable provider, insufficient evidence, or duplicate topic produces a visible failed slot, not filler. The feature targets three drafts/day but cannot guarantee three adequately sourced stories every day. The seven-day topic match is a heuristic, not semantic certainty.

The provider chooses stories and supplies factual notes/publication dates. URL provenance and policy checks do not prove factual truth, source independence, trend importance or originality. Human verification remains required, especially for political allegations. No raw copyrighted source pages are stored or scraped by this application. Source material is handled by the research provider.

The run ledger atomically claims slots before API calls and saves each article, metadata, audit entry and completion record in one transaction. If the function is killed after a provider request, its slot can remain `running`; it will not automatically retry and risk another charge. Inspect that day's `newsroom.ai_draft_runs` before deliberate administrative recovery. The next day's slots are independent. No additional queue, service accounts or publishing privileges are introduced.

## Checks

`npx tsx --test tests/ai-drafts.test.ts` uses mocked API responses and incurs no AI charges. `npm run check` verifies types. A real paid generation cycle and database migration require credentials/deployment; these must be verified during activation.

API contract: https://developers.openai.com/api/docs/guides/tools-web-search and https://developers.openai.com/api/docs/guides/structured-outputs .
