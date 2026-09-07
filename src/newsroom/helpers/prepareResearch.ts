import {sql} from 'kysely';
import {db} from './db';
import {categories,periodKey,sections,type Category} from './aiDraftPolicy';
import {buildPacket,publisherKey,type FeedItem,type ResearchSlot,type ResearchPacket} from './researchPolicy';
export const researchEnabled=()=>process.env.DAILY_RESEARCH_ENABLED==='true';
export async function getResearch() {
  const period=periodKey();
  const runs=await db.selectFrom('aiDraftRuns').select(['category','articleId','researchPacket']).where('period','=',period).execute();
  const slots:ResearchSlot[]=categories.map(category=>{
    const r=runs.find(x=>x.category===category);
    return {category,articleId:r?.articleId||null,packet:r?.researchPacket||null};
  });
  return {enabled:researchEnabled(),period,slots};
}
// Pure database/metadata workflow: no fetch, SDK, model, embeddings or paid provider.
export async function prepareResearch(refresh?:Category) {
  if(!researchEnabled())return getResearch();
  const now=new Date(),period=periodKey(now);
  const already:Category[]=[];
  await db.transaction().execute(async trx=>{
    // All prepare/refresh/create requests share a short transaction lock. A killed
    // request rolls back; there are no external calls or stranded billable slots.
    await sql`SELECT pg_advisory_xact_lock(6170260910)`.execute(trx);
    const rows=await trx.selectFrom('articles').innerJoin('sources','sources.id','articles.sourceId')
      .select(['articles.title','articles.excerpt','articles.sourceUrl','articles.publishedAt','articles.section','sources.name','sources.website'])
      .where('sources.enabled','=',true).where('articles.status','=','published')
      .where('articles.publishedAt','>=',new Date(now.getTime()-14*86400000)).where('articles.publishedAt','<=',now)
      .orderBy('articles.publishedAt','desc').limit(600).execute();
    const feed:FeedItem[]=rows.flatMap(r=>{
      try {return r.sourceUrl&&r.publishedAt?[{title:r.title,snippet:r.excerpt,url:r.sourceUrl,publication:r.name,publisherKey:publisherKey(r.website,r.name),publishedAt:r.publishedAt.toISOString(),section:r.section}]:[];}catch{return [];}
    });
    for(const category of refresh?[refresh]:categories){
      const prior=await trx.selectFrom('aiDraftRuns').selectAll().where('period','=',period).where('category','=',category).executeTakeFirst();
      if(prior&&(prior.articleId||!refresh)){already.push(category);continue;}
      const runs=await trx.selectFrom('aiDraftRuns').select(['period','category','topic','sourceUrls']).where('period','>=',periodKey(new Date(now.getTime()-7*86400000))).execute();
      const used=runs.filter(r=>!(r.period===period&&r.category===category)&&r.topic).map(r=>({topic:r.topic!,urls:r.sourceUrls}));
      // Include ordinary original articles so research does not duplicate the newsroom's recent work.
      const originals=await trx.selectFrom('articles').select('title').where('sourceId','is',null).where('createdAt','>=',new Date(now.getTime()-7*86400000)).limit(100).execute();
      used.push(...originals.map(a=>({topic:a.title,urls:[]})));
      const packet=buildPacket(category,feed,used,now);
      const values={status:'completed',topic:packet.topic,sourceUrls:sql<string[]>`${JSON.stringify(packet.sources.map(s=>s.url))}::jsonb`,researchPacket:sql<ResearchPacket>`${JSON.stringify(packet)}::jsonb`,finishedAt:now,error:null};
      if(prior)await trx.updateTable('aiDraftRuns').set(values).where('period','=',period).where('category','=',category).execute();
      else await trx.insertInto('aiDraftRuns').values({period,category,...values}).execute();
      await trx.insertInto('auditLog').values({userId:null,articleId:null,action:`research:${refresh?'refresh':'prepare'}:${period}:${category}`}).execute();
    }
  });
  const result=await getResearch();return {...result,slots:result.slots.map(s=>({...s,alreadyPrepared:already.includes(s.category)}))};
}
export async function createResearchDraft(category:Category,user:{id:number;displayName:string}) {
  return db.transaction().execute(async trx=>{
    await sql`SELECT pg_advisory_xact_lock(6170260910)`.execute(trx);
    const period=periodKey(),run=await trx.selectFrom('aiDraftRuns').selectAll().where('period','=',period).where('category','=',category).executeTakeFirstOrThrow();
    if(run.articleId)return {articleId:run.articleId};
    const packet=run.researchPacket;
    if(!packet?.sources.length)throw new Error('Prepare a packet with source metadata first');
    const article=await trx.insertInto('articles').values({slug:`research-${period}-${category}`,title:packet.topic,excerpt:'',body:'',section:sections[category],status:'draft',publishedAt:null,featured:false,sourceId:null,sourceUrl:null,authorId:user.id,byline:user.displayName,researchMetadata:sql`${JSON.stringify(packet)}::jsonb`}).returning('id').executeTakeFirstOrThrow();
    await trx.updateTable('aiDraftRuns').set({articleId:article.id}).where('period','=',period).where('category','=',category).execute();
    await trx.insertInto('auditLog').values({userId:user.id,articleId:article.id,action:'research:create-draft:'+category}).execute();
    return {articleId:article.id};
  });
}
