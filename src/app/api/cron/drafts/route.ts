import {timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {categories} from '@/newsroom/helpers/aiDraftPolicy';
import {prepareResearch,getResearch,createResearchDraft} from '@/newsroom/helpers/prepareResearch';
import {newsroomAccess} from '@/newsroom/helpers/newsroomAccess';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function editor(r:Request){const user=await newsroomAccess(r);if(user.newsroomRole==='writer')throw new Error('Editor required');return user;}
export async function GET(r:Request){
  if(new URL(r.url).searchParams.get('view')==='1'){
    try{await editor(r);}catch{return json({error:'Editor access required'},403);}
    try{return json(await getResearch());}catch{return json({error:'Research unavailable. Check the database migration.'},503);}
  }
  const secret=process.env.CRON_SECRET;
  if(!secret)return json({error:'Cron not configured'},503);
  const actual=Buffer.from(r.headers.get('authorization')||''),expected=Buffer.from('Bearer '+secret);
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return json({error:'Unauthorised'},401);
  try{return json(await prepareResearch());}catch{return json({error:'Research preparation failed. Check the database migration.'},503);}
}
const actionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('prepare')}),
  z.object({action:z.literal('refresh'),category:z.enum(categories)}),
  z.object({action:z.literal('create'),category:z.enum(categories)}),
]);
export async function POST(r:Request){
  let user;try{user=await editor(r);}catch{return json({error:'Editor access required'},403);}
  if(Number(r.headers.get('content-length')||0)>1000)return json({error:'Request too large'},413);
  let input;try{const text=await r.text();if(text.length>1000)return json({error:'Request too large'},413);input=actionSchema.parse(JSON.parse(text));}catch{return json({error:'Invalid research action'},400);}
  try{
    if(input.action==='create')return json(await createResearchDraft(input.category,user));
    return json(await prepareResearch(input.action==='refresh'?input.category:undefined));
  }catch{return json({error:'Research action failed. Check that the migration is applied and the packet has sources.'},503);}
}
