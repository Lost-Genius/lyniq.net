import {getServerUserSession} from './getServerUserSession';import {db} from './db';
export async function newsroomAccess(request:Request){if(request.method==='POST'){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new Error('Cross-origin request denied');}
const {user}=await getServerUserSession(request);const member=await db.selectFrom('teamMembers').selectAll().where('userId','=',user.id).executeTakeFirst();if(!member)throw new Error('Newsroom access required');return {...user,newsroomRole:member.role};}
