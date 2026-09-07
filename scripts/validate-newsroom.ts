import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import superjson from 'superjson';

async function main() {
  if (process.env.NEWSROOM_VALIDATE !== '1') return;
  const { db } = await import('../src/newsroom/helpers/db');
  const { handle: join } = await import('../src/newsroom/endpoints/join_POST');
  const { handle: login } = await import('../src/newsroom/endpoints/auth/login_with_password_POST');
  const { handle: edit } = await import('../src/newsroom/endpoints/editor_POST');
  const { publicArticle } = await import('../src/newsroom/helpers/publicArticle');
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  const email = `migration-${randomBytes(8).toString('hex')}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  let userId: number | undefined;
  const request = (data: unknown, cookie = '', origin = 'https://lyniq.net') => new Request('https://lyniq.net/_api/editor', {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie, origin }, body: superjson.stringify(data),
  });
  try {
    await db.insertInto('invitations').values({ tokenHash: hash, email, role: 'writer', expiresAt: new Date(Date.now() + 600000) }).execute();
    const account = { token, email, password, displayName: 'Migration verification' };
    assert.equal((await join(request({ ...account, email: 'wrong@example.invalid' }))).status, 403, 'Invitation email binding');
    assert.equal((await join(request(account))).status, 200, 'Invitation signup');
    userId = (await db.selectFrom('users').select('id').where('email', '=', email).executeTakeFirstOrThrow()).id;
    assert.equal((await join(request(account))).status, 403, 'Invitation replay denied');
    const session = await login(request({ email, password }));
    assert.equal(session.status, 200, 'Password login');
    const setCookie = session.headers.get('set-cookie') || '';
    assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /Secure/); assert.match(setCookie, /SameSite=Lax/);
    const cookie = setCookie.split(';')[0];
    const draft = { action: 'save', title: 'Migration verification draft', excerpt: '', body: 'Private automated migration verification. This draft must never be publicly visible.', section: 'Local', status: 'draft', publishedAt: null, featured: false };
    assert.equal((await edit(request(draft))).status, 403, 'Anonymous edit denied');
    assert.equal((await edit(request(draft, cookie, 'https://example.invalid'))).status, 403, 'Cross-origin edit denied');
    assert.equal((await edit(request(draft, cookie))).status, 200, 'Writer draft save');
    const article = await db.selectFrom('articles').selectAll().where('authorId', '=', userId).executeTakeFirstOrThrow();
    assert.equal(await publicArticle(article.slug), null, 'Draft hidden');
    assert.equal((await edit(request({ ...draft, status: 'published' }, cookie))).status, 400, 'Writer publication denied');
    assert.equal((await edit(request({ action: 'invite', email, role: 'editor' }, cookie))).status, 400, 'Writer invitations denied');
    assert.equal((await edit(request({ ...draft, id: article.id, version: article.version - 1 }, cookie))).status, 400, 'Stale edit denied');
    await db.updateTable('teamMembers').set({ role: 'editor' }).where('userId', '=', userId).execute();
    assert.equal((await edit(request({ ...draft, id: article.id, version: article.version, status: 'scheduled', publishedAt: new Date(Date.now() + 3600000).toISOString() }, cookie))).status, 200, 'Editor scheduling');
    assert.equal(await publicArticle(article.slug), null, 'Future publication hidden');
    await db.updateTable('articles').set({ publishedAt: new Date(Date.now() - 1000) }).where('id', '=', article.id).execute();
    assert.equal((await publicArticle(article.slug))?.id, article.id, 'Due scheduled article visible');
    console.log('PASS: invitation binding/replay, password login, secure cookie, anonymous and cross-origin denial, writer restrictions, optimistic concurrency, scheduled visibility.');
  } finally {
    // Only this run's random account and its drafts are removed.
    if (userId) {
      await db.deleteFrom('auditLog').where('userId', '=', userId).execute();
      await db.deleteFrom('articles').where('authorId', '=', userId).execute();
      await db.deleteFrom('sessions').where('userId', '=', userId).execute();
      await db.deleteFrom('teamMembers').where('userId', '=', userId).execute();
      await db.deleteFrom('userPasswords').where('userId', '=', userId).execute();
      await db.deleteFrom('users').where('id', '=', userId).execute();
    }
    await db.deleteFrom('loginAttempts').where('email', '=', email).execute();
    await db.deleteFrom('invitations').where('tokenHash', '=', hash).execute();
    await db.destroy();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
