import { sql } from 'kysely';
import { db } from './db';
import { categories, periodKey, sections, sourcePolicy, validateDraft, sameStory, type Category, type AiDraftMetadata } from './aiDraftPolicy';
import { providerConfig, researchDraft } from './aiDraftProvider';

export async function generateAiDrafts(retryFailed = false) {
  const config = providerConfig();
  if (!config) return { enabled: false, results: [] };
  const policy = sourcePolicy(), now = new Date(), period = periodKey(now);
  const recent = await db.selectFrom('aiDraftRuns').select(['topic','sourceUrls']).where('status','=','completed').where('period','>=',periodKey(new Date(now.getTime()-7*86400000))).execute();
  const results = await Promise.all(categories.map(async (category: Category) => {
    // Atomic slot claim occurs before any billable API request. Never reclaim running slots:
    // an interrupted provider call may already have incurred cost.
    let claim = await db.insertInto('aiDraftRuns').values({period,category}).onConflict(oc=>oc.columns(['period','category']).doNothing()).returning('period').executeTakeFirst();
    if (!claim && retryFailed) claim = await db.updateTable('aiDraftRuns').set({status:'running',attempts:sql<number>`attempts + 1`,error:null,startedAt:new Date(),finishedAt:null}).where('period','=',period).where('category','=',category).where('status','=','failed').where('attempts','<',2).returning('period').executeTakeFirst();
    if (!claim) {
      const run = await db.selectFrom('aiDraftRuns').select(['status','articleId','error']).where('period','=',period).where('category','=',category).executeTakeFirstOrThrow();
      return {category, ...run, skipped:true};
    }
    try {
      const result = await researchDraft(category, recent.map(r=>r.topic||''), policy, config, now);
      const draft = validateDraft(result.draft, result.evidence, category, policy, now);
      const urls = draft.sources.map(s=>s.url);
      const metadata: AiDraftMetadata = {category,generatedAt:new Date().toISOString(),provider:config.provider,model:config.model,topic:draft.topic,tags:draft.tags,sources:draft.sources,reviewNote:'AI-generated draft. Verify every claim, source date, allegation and attribution before publishing. Suggested facts are not independently verified by software.'};
      const article = await db.transaction().execute(async trx => {
        // Serialize the short save phase, not the provider call, to deduplicate across categories.
        await sql`SELECT pg_advisory_xact_lock(6170260910)`.execute(trx);
        const completed = await trx.selectFrom('aiDraftRuns').select(['topic','sourceUrls']).where('status','=','completed').where('period','>=',periodKey(new Date(now.getTime()-7*86400000))).execute();
        if (completed.some(r=>sameStory({topic:draft.topic,urls},{topic:r.topic||'',urls:r.sourceUrls}))) throw new Error('Story already drafted within the last seven days');
        const a = await trx.insertInto('articles').values({slug:`ai-${period}-${category}`,title:draft.headline,excerpt:draft.deck,body:draft.body,section:sections[category],status:'draft',publishedAt:null,featured:false,sourceId:null,sourceUrl:null,authorId:null,byline:'Lyniq newsroom',aiMetadata:sql`${JSON.stringify(metadata)}::jsonb`}).returning('id').executeTakeFirstOrThrow();
        await trx.insertInto('auditLog').values({userId:null,articleId:a.id,action:'ai:draft:'+category}).execute();
        await trx.updateTable('aiDraftRuns').set({status:'completed',articleId:a.id,topic:draft.topic,sourceUrls:sql`${JSON.stringify(urls)}::jsonb`,finishedAt:new Date()}).where('period','=',period).where('category','=',category).execute();
        return a;
      });
      return {category,status:'completed',articleId:article.id};
    } catch (error) {
      // No provider body/secret or raw SQL errors in the editor or public logs.
      const message = error instanceof Error && /^(AI |No web|Insufficient|Incomplete|Politics|Source |At least|Unsafe|Restricted|Unapproved|Story already)/.test(error.message) ? error.message.slice(0,250) : 'Generation or validation failed; inspect configuration before retrying.';
      await db.updateTable('aiDraftRuns').set({status:'failed',error:message,finishedAt:new Date()}).where('period','=',period).where('category','=',category).execute();
      return {category,status:'failed',error:message};
    }
  }));
  return {enabled:true,period,results};
}
