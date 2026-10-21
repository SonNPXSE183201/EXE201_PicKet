import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { renderRelease } from '../src/release.mjs';
const root = new URL('../', import.meta.url);
test('release page is readable without JavaScript and points to one approved APK', async () => {
  const release = JSON.parse(await readFile(new URL('release.json',root),'utf8'));
  const html = renderRelease(await readFile(new URL('site/index.html',root),'utf8'),release);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.match(html, /<html lang="vi">/);
  assert.match(html, /<main id="main">/);
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes('{{'));
  assert.equal((html.match(new RegExp('href="/downloads/'+release.filename+'"','g'))||[]).length,2);
  assert.match(html, /Không bắt buộc tạo tài khoản/);
  assert.match(html, /Chưa có trên Google Play/);
});
test('Caddy serves only landing paths statically and preserves existing Next routes', async () => {
  const caddy = await readFile(new URL('../../../deploy/Caddyfile',import.meta.url),'utf8');
  assert.match(caddy, /@landing path \/ \/launch-assets\/\* \/downloads\/\* \/release\.json/);
  assert.match(caddy, /root \* \/srv\/picket-landing/);
  assert.match(caddy, /handle \{\s*reverse_proxy web:3000\s*\}/);
  assert.match(caddy, /application\/vnd\.android\.package-archive/);
  assert.match(caddy, /@revalidated not path \/downloads\/\*\.apk/);
  assert.match(caddy, /header @revalidated Cache-Control "no-cache"/);
});

test('landing exposes same-origin web login in header, hero and footer without downloading or opening another tab', async () => {
  const html = await readFile(new URL('site/index.html', root), 'utf8');
  for (const [name, pattern] of [
    ['header', /<header\b[\s\S]*?<\/header>/],
    ['hero', /<div class="hero-actions">[\s\S]*?<\/div>/],
    ['footer', /<footer\b[\s\S]*?<\/footer>/],
  ]) {
    const section = html.match(pattern)?.[0] ?? '';
    const link = section.match(/<a\b[^>]*href="\/login"[^>]*>Đăng nhập<\/a>/)?.[0];
    assert.ok(link, `${name} must expose web login`);
    assert.doesNotMatch(link, /\b(download|target)=?/);
  }
});

test('landing distinguishes web account requirement from Android guest usage', async () => {
  const html = await readFile(new URL('site/index.html', root), 'utf8');
  assert.match(html, /Bản web cần đăng nhập và kết nối mạng/);
});
