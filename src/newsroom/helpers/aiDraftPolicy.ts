import { z } from 'zod';

export const categories = ['politics', 'entertainment', 'technology'] as const;
export type Category = typeof categories[number];
export const sections = { politics: 'Local', entertainment: 'Culture', technology: 'Tech' } as const;
// Research permission is separate from RSS republication permission. Do not enable RSS feeds here.
export const defaultSources = [
  ['guardian.co.tt', 'Trinidad Guardian'], ['trinidadexpress.com', 'Trinidad Express'],
  ['newsday.co.tt', 'Newsday'], ['wired868.com', 'Wired868'], ['tt.loopnews.com', 'Loop News'],
  ['ttparliament.org', 'Trinidad and Tobago Parliament'], ['opm.gov.tt', 'Office of the Prime Minister'],
  ['globalvoices.org', 'Global Voices'], ['reuters.com', 'Reuters'], ['apnews.com', 'Associated Press'],
  ['bbc.com', 'BBC'], ['bbc.co.uk', 'BBC'], ['theguardian.com', 'The Guardian'],
  ['foxnews.com', 'Fox News'], ['billboard.com', 'Billboard'], ['variety.com', 'Variety'],
  ['arstechnica.com', 'Ars Technica'], ['theverge.com', 'The Verge'], ['techcrunch.com', 'TechCrunch'],
] as const;
export function sourcePolicy(env: Record<string, string | undefined> = process.env) {
  const entries = env.AI_DRAFT_SOURCES_JSON ? z.array(z.tuple([z.string(), z.string().min(1)])).min(2).max(80).parse(JSON.parse(env.AI_DRAFT_SOURCES_JSON)) : defaultSources;
  const blocked = (env.AI_DRAFT_BLOCKED_DOMAINS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  for (const [domain] of entries) if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) throw new Error('Invalid research source domain');
  return { entries, blocked };
}
export type Policy = ReturnType<typeof sourcePolicy>;
export function canonicalUrl(value: string) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password) throw new Error('Unsafe source URL');
  u.hash = ''; for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) u.searchParams.delete(key);
  u.hostname = u.hostname.replace(/^www\./, ''); return u.toString().replace(/\/$/, '');
}
export function publisher(url: string, policy: Policy) {
  const host = new URL(canonicalUrl(url)).hostname;
  const matches = (domain: string) => host === domain || host.endsWith('.' + domain);
  if (policy.blocked.some(matches)) throw new Error('Restricted research source');
  const source = policy.entries.find(([domain]) => matches(domain));
  if (!source) throw new Error('Unapproved research source');
  return source[1];
}
export const draftSchema = z.object({
  sufficientEvidence: z.boolean(), reason: z.string().max(500),
  headline: z.string().max(240), deck: z.string().max(500), body: z.string().max(16000),
  topic: z.string().max(160), localRelevance: z.boolean(), tags: z.array(z.string().max(50)).max(8),
  sources: z.array(z.object({ url: z.string().url(), publishedAt: z.string().datetime(), facts: z.array(z.string().max(400)).min(1).max(5) })).max(6),
});
export type Draft = z.infer<typeof draftSchema>;
export type AiDraftMetadata = { category: Category; generatedAt: string; provider: string; model: string; topic: string; tags: string[]; sources: {url: string; publication: string; publishedAt: string; facts: string[]}[]; reviewNote: string };
export function periodKey(now = new Date()) { return new Date(now.getTime() - 4 * 3600000).toISOString().slice(0, 10); }
export function validateDraft(input: unknown, evidence: string[], category: Category, policy: Policy, now = new Date()) {
  const draft = draftSchema.parse(input);
  if (!draft.sufficientEvidence) throw new Error('Insufficient current multi-source evidence');
  if (draft.headline.length < 10 || draft.body.length < 700 || draft.topic.length < 8) throw new Error('Incomplete article');
  if (category === 'politics' && !draft.localRelevance) throw new Error('Politics must concern Trinidad and Tobago');
  const observed = new Set(evidence.flatMap(url => { try { return [canonicalUrl(url)]; } catch { return []; } }));
  const sources = draft.sources.map(source => {
    const url = canonicalUrl(source.url);
    if (!observed.has(url)) throw new Error('Source missing from research evidence');
    const age = now.getTime() - Date.parse(source.publishedAt);
    if (age < -300000 || age > 72 * 3600000) throw new Error('Source is outside the 72-hour news window');
    return { ...source, url, publication: publisher(url, policy) };
  });
  if (new Set(sources.map(s => s.publication)).size < 2) throw new Error('At least two distinct publishers required');
  return { ...draft, sources };
}
export function sameStory(a: {topic: string; urls: string[]}, b: {topic: string; urls: string[]}) {
  if (a.urls.some(url => b.urls.includes(url))) return true;
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3));
  const x = words(a.topic), y = words(b.topic), shared = [...x].filter(w => y.has(w)).length;
  return shared >= 3 && shared / Math.max(1, Math.min(x.size, y.size)) >= 0.7;
}
