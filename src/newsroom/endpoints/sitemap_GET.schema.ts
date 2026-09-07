export type OutputType=string;export async function getSitemap():Promise<string>{const r=await fetch('/sitemap.xml');if(!r.ok)throw new Error('Sitemap unavailable');return r.text()}
