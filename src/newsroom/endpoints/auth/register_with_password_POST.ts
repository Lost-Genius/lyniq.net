import superjson from 'superjson';export async function handle(){return new Response(superjson.stringify({message:'Registration is invitation-only. Use your newsroom invitation.'}),{status:403})}
