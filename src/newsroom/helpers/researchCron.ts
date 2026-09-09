import {timingSafeEqual} from 'node:crypto';

// Keep authorization ahead of every preparation side effect. The callback also
// lets local tests verify dispatch without opening a database connection.
export async function researchCron(request:Request, prepare:()=>Promise<unknown>) {
  const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
  const secret=process.env.CRON_SECRET;
  const actual=Buffer.from(request.headers.get('authorization')||'');
  const expected=Buffer.from('Bearer '+(secret||''));
  if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected)) {
    return json({error:'Unauthorised'},401);
  }
  try{return json(await prepare());}
  catch{return json({error:'Research preparation unavailable'},503);}
}
