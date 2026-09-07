import superjson from 'superjson';import type {publicNews} from '../helpers/publicNews';
export type OutputType=Awaited<ReturnType<typeof publicNews>>;
export async function getNews():Promise<OutputType>{const r=await fetch('/_api/news');if(!r.ok)throw new Error('News is temporarily unavailable. Please try again.');return superjson.parse(await r.text());}
