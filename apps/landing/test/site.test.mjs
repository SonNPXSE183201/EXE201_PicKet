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
  // Content/download remain server-rendered; progressive motion uses local modules only.
  const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/g) ?? [];
  assert.equal(scripts.length, 2);
  assert.match(scripts[0], /^<script type="module" src="\/launch-assets\/paper-motion-v1\.js"><\/script>$/);
  assert.match(scripts[1], /^<script type="module" src="\/launch-assets\/analytics\.js"><\/script>$/);
  assert.ok(!html.includes('{{'));
  assert.equal((html.match(new RegExp('href="/downloads/'+release.filename+'"','g'))||[]).length,2);
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

test('landing exposes same-origin web login in header and footer without downloading or opening another tab', async () => {
  const html = await readFile(new URL('site/index.html', root), 'utf8');
  for (const [name, pattern] of [
    ['header', /<header\b[\s\S]*?<\/header>/],
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

test('landing v2 keeps store rollout configurable and avoids scroll-driven motion', async () => {
  const html = await readFile(new URL('site/index.html', root), 'utf8');
  const motion = await readFile(new URL('site/launch-assets/paper-motion-v1.js', root), 'utf8');
  const styles = await readFile(new URL('site/launch-assets/paper-motion-v1.css', root), 'utf8');
  assert.match(motion, /PLAY_STORE_URL = '#'/);
  assert.match(html, /data-play-link/);
  assert.doesNotMatch(`${html}\n${motion}\n${styles}`, /scroll-progress|IntersectionObserver|animation-timeline|scroll-timeline/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
});

test('landing publishes only verified support and policy details', async () => {
  const html = await readFile(new URL('site/index.html', root), 'utf8');
  assert.doesNotMatch(html, /support@picket\.vn|\/terms\.html|Không quảng cáo/);
  assert.match(html, /0369 076 214/);
  assert.match(html, /picketfinance@gmail\.com/);
  assert.match(html, /\/account-deletion\.html/);
});
