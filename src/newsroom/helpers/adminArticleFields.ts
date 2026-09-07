import type {Selectable} from 'kysely';
import type {Articles} from './schema';

// Positive allowlist: newly added database fields are private until explicitly reviewed.
export const writerArticleFields = [
  'id','slug','title','excerpt','body','section','status','authorId','byline',
  'sourceId','sourceUrl','featured','publishedAt','createdAt','updatedAt','version',
] as const satisfies readonly (keyof Articles)[];
export const editorArticleFields = [...writerArticleFields,'aiMetadata','researchMetadata'] as const;
export type AdminArticle = Pick<Selectable<Articles>,typeof writerArticleFields[number]> &
  Partial<Pick<Selectable<Articles>,'aiMetadata'|'researchMetadata'>>;
export function adminArticleResponse(article:Record<string,unknown>,writer:boolean):AdminArticle {
  const fields=writer?writerArticleFields:editorArticleFields;
  return Object.fromEntries(fields.filter(key=>Object.hasOwn(article,key)).map(key=>[key,article[key]])) as AdminArticle;
}
