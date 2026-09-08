# Free daily research packets

The Daily AI Drafts feature now prepares research packets from existing approved feed imports. It never calls an AI provider, scrapes full articles, automates ChatGPT, or automatically creates/publishes articles. The old provider module was deleted. Old AI API keys/model settings have no effect and may be removed from Vercel. Existing nullable AI metadata and table names remain for backwards compatibility only.

## Configuration and deployment (not performed automatically)

- Set `DAILY_RESEARCH_ENABLED=true` to enable scheduled/manual preparation. It is disabled by default; `AI_DRAFT_ENABLED` is no longer read.
- Reuse the existing server-only `DATABASE_URL` and `CRON_SECRET`. No API keys, model, embeddings, news API subscriptions or additional service are required.
- Apply `scripts/migrate-ai-drafts.mjs` with `AI_DRAFT_MIGRATE=1` and a real DATABASE_URL before deploying. The retained flag is migration-only, not an AI switch. On Vercel, a deployment build can receive `--build-env AI_DRAFT_MIGRATE=1`; the existing build script runs this additive migration. Do not enable the old Floot migration. This works whether the previous AI-draft migration was already applied or not.
- The migration adds nullable `research_packet` to the daily ledger and `research_metadata` to articles. Existing community/editor data and historical AI metadata remain intact.
- Release authorized on 8 September 2026. The additive migration passed with and without the previous AI migration, including repeat application and preservation of existing article/AI values. Isolated real-database checks cover concurrent preparation, JSON round trips, draft privacy, signed sessions and role downgrades. Production uses DAILY_RESEARCH_ENABLED=true.

## Daily operation

The existing `/api/cron/drafts` cron remains at `30 10 * * *`: approximately 06:30 Trinidad time, with Vercel Hobby scheduling precision. The feed-import cron is unchanged. Research reads already-imported records; it does not start another ingestion job. If the two cron jobs run out of order, packets may reflect the prior import. Run the existing Sources -> Import approved feeds now action, then refresh research when needed.

Each Trinidad calendar day has three unique slots: T&T Politics / Current Affairs, Entertainment, Technology. Preparation and draft creation share a short database transaction lock and a unique daily/category key. Repeated prepare calls preserve existing packets. Refresh recomputes one slot from current imported metadata, excluding its own prior packet from deduplication. Once a draft is linked, refresh preserves it. Repeated Create Draft calls return that same article ID.

Only enabled existing sources with imported published articles are considered. Candidate metadata is bounded to the latest 600 imported items within 14 days, using only title, excerpt (up to 240 characters), publication, source link, date and section. No source body is read. Politics requires Local section plus current-affairs keywords; Entertainment and Technology use keywords/sections and favor recent Trinidad/Caribbean leads. Ranking uses recency, matched publisher count and geographic preference, not popularity or trend measurements.

Normalized headline overlap and publication timing group likely events. A packet needs at least two recent publishers with nonidentical matching headlines to be marked Research Ready. Duplicate/syndicated headline and possible negation disagreements are flagged; possible disagreement prevents Ready. Readiness is a lead-selection heuristic, not verified factual corroboration. Single-source local leads are retained as Insufficient Sources. Old/no metadata produces an explicitly incomplete packet, not fabricated summaries. The aggregation is only a count of feed items, publishers and recent items. Tags come from the category and headline words.

Prior seven-day packet URLs/topics and recent manually created article headlines reduce duplicate story selection. Publisher names and known multi-feed publishers (Global Voices, BBC) are grouped so their feeds cannot count as distinct newsrooms. Additional sources use the existing source configuration and permission workflow; research never enables blocked or paused sources.

## Manual complete-cycle check

1. Sign in as an editor/owner at https://www.lyniq.net/newsroom/login and open Articles in /admin.
2. Import approved feeds through the existing Sources tab if fresh metadata is needed.
3. Under Articles, click Prepare today's research. Inspect all three category slots and View Sources. Running preparation again should report Already Prepared and preserve packets.
4. Click Copy ChatGPT Draft Prompt. Paste it manually into your own ChatGPT conversation. If browser clipboard access fails, the UI exposes a selectable text box instead. No ChatGPT URL, credential or account automation is used.
5. The prompt asks for an original headline, deck, body and tags, with neutral attribution and no invented facts/quotes. It tells ChatGPT not to browse without explicit permission and to report insufficient evidence. Feed text is labelled untrusted evidence, never instructions.
6. Click Create Draft for a packet with sources, or Open Draft if already linked. It opens a normal unpublished Lyniq draft with suggested headline and EMPTY deck/body. Paste your reviewed text into the existing fields and Save draft. Sources remain in internal research metadata; include appropriate attribution in the article text. Suggested tags remain metadata because the existing editor has no tag field.
7. Confirm the draft is not publicly visible. Only the existing editor Publish/Schedule controls can publish it. Repeat Create/Open to confirm it does not create duplicates. Refresh is available only before a draft is linked.

Editors/owners use the existing session, role and cross-origin checks. Writers cannot trigger preparation, view the research dashboard or create research-linked drafts through this endpoint. Cron uses the existing bearer CRON_SECRET. Public article queries explicitly exclude internal AI/research metadata.

## Tests and limits

Run `node node_modules/tsx/dist/cli.mjs --test tests/research.test.ts` and `npm run check`. The tests use synthetic feed metadata and make no external requests; nine focused cases pass. They cover local day boundaries, source matching, recency, grouping, duplicate topics, prompts, removed paid-provider code, and anonymous/cross-origin rejection. A real database cycle remains to be verified after authorized migration/deployment.

No paid AI/API dependency remains in this feature. Research consumes existing Vercel/PostgreSQL resources, so it remains subject to the hosting/database free-tier quotas; it cannot promise unlimited free hosting. No plan upgrades or extra services are introduced. Existing feed coverage is limited, so some or all slots may be Insufficient Sources. The software cannot verify facts, source independence, semantic contradictions or importance from short snippets. Human research and editorial review remain essential.
