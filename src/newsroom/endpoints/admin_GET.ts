import {db} from '../helpers/db';
import {newsroomAccess} from '../helpers/newsroomAccess';
import {writerArticleFields,editorArticleFields,adminArticleResponse} from '../helpers/adminArticleFields';
import superjson from 'superjson';

// Injected dependencies support isolated API regression tests; HTTP callers cannot supply them.
export function createAdminHandler(database:Pick<typeof db,'selectFrom'>,authorize:typeof newsroomAccess){
  return async function(request:Request){
    try{
      const user=await authorize(request);
      if(!['writer','editor','owner'].includes(user.newsroomRole))throw new Error('Invalid membership');
      const writer=user.newsroomRole==='writer';
      let q=database.selectFrom('articles').select(writer?writerArticleFields:editorArticleFields);
      if(writer)q=q.where('authorId','=',user.id);
      const rows=await q.orderBy('updatedAt','desc').limit(200).execute();
      // Also enforce the response boundary: no broad row object can leak future private fields.
      const articles=rows.filter(a=>!writer||a.authorId===user.id).map(a=>adminArticleResponse(a,writer));
      const sources=writer?[]:await database.selectFrom('sources').selectAll().execute();
      const members=user.newsroomRole==='owner'?await database.selectFrom('teamMembers').innerJoin('users','users.id','teamMembers.userId').select(['teamMembers.userId','teamMembers.role','users.displayName','users.email']).execute():[];
      return new Response(superjson.stringify({role:user.newsroomRole,userId:user.id,articles,sources,members}),{headers:{'Cache-Control':'no-store'}});
    }catch{return new Response(superjson.stringify({error:'Please sign in with a newsroom account.'}),{status:403,headers:{'Cache-Control':'no-store'}});}
  };
}
export const handle=createAdminHandler(db,newsroomAccess);
