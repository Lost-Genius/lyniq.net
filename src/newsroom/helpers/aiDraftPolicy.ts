export const categories = ['politics', 'entertainment', 'technology'] as const;
export type Category = typeof categories[number];
export const sections = { politics: 'Local', entertainment: 'Culture', technology: 'Tech' } as const;
export function canonicalUrl(value: string) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password) throw new Error('Unsafe source URL');
  u.hash = ''; for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) u.searchParams.delete(key);
  u.hostname = u.hostname.replace(/^www\./, ''); return u.toString().replace(/\/$/, '');
}
// Legacy metadata type retained for existing drafts; no provider code remains.
export type AiDraftMetadata = { category: Category; generatedAt: string; provider: string; model: string; topic: string; tags: string[]; sources: {url: string; publication: string; publishedAt: string; facts: string[]}[]; reviewNote: string };
export function periodKey(now = new Date()) { return new Date(now.getTime() - 4 * 3600000).toISOString().slice(0, 10); }
export function sameStory(a: {topic: string; urls: string[]}, b: {topic: string; urls: string[]}) {
  if (a.urls.some(url => b.urls.includes(url))) return true;
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3));
  const x = words(a.topic), y = words(b.topic), shared = [...x].filter(w => y.has(w)).length;
  return shared >= 3 && shared / Math.max(1, Math.min(x.size, y.size)) >= 0.7;
}
