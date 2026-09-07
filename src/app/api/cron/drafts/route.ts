import { timingSafeEqual } from 'node:crypto';
import { generateAiDrafts } from '@/newsroom/helpers/generateAiDrafts';
import { newsroomAccess } from '@/newsroom/helpers/newsroomAccess';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
async function run(retry = false) {
  try {
    const result = await generateAiDrafts(retry);
    return Response.json(result, {status:result.results.some(r=>r.status==='failed')?502:200,headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({error:'AI drafting unavailable. Check credentials and database migration.'},{status:503}); }
}
// Existing cron-secret trust boundary. The job can only insert drafts, never publish.
export async function GET(r: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({error:'Cron not configured'},{status:503});
  const actual = Buffer.from(r.headers.get('authorization')||''), expected = Buffer.from('Bearer '+secret);
  if (actual.length!==expected.length || !timingSafeEqual(actual,expected)) return Response.json({error:'Unauthorised'},{status:401});
  return run();
}
// Manual cycle uses existing newsroom session, role and CSRF checks. No API key in the browser.
export async function POST(r: Request) {
  try { const user = await newsroomAccess(r); if (user.newsroomRole==='writer') throw new Error('Editor required'); }
  catch { return Response.json({error:'Editor access required'},{status:403}); }
  return run(new URL(r.url).searchParams.get('retry')==='failed');
}
