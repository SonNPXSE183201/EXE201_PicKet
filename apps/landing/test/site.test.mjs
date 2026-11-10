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

test('landing and policy pages open the web login page in header and footer without downloading or opening another tab', async () => {
  for (const page of ['index.html', 'privacy.html', 'account-deletion.html']) {
    const html = await readFile(new URL('site/' + page, root), 'utf8');
    assert.doesNotMatch(html, /href="\/login"/, `${page} must not rely on the /login redirect`);
    for (const [name, pattern] of [
      ['header', /<header\b[\s\S]*?<\/header>/],
      ['footer', /<footer\b[\s\S]*?<\/footer>/],
    ]) {
      const section = html.match(pattern)?.[0] ?? '';
      const link = section.match(/<a\b[^>]*href="https:\/\/app\.picketfinance\.com\/login"[^>]*>Đăng nhập<\/a>/)?.[0];
      assert.ok(link, `${page} ${name} must expose web login`);
      assert.doesNotMatch(link, /\b(download|target)=?/);
    }
  }
});

test('policy pages reuse the landing v2 header, footer and styles', async () => {
  const index = await readFile(new URL('site/index.html', root), 'utf8');
  const footerLinks = (html) => [...(html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '').matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/^\/#/, '#'));
  for (const page of ['privacy.html', 'account-deletion.html']) {
    const html = await readFile(new URL('site/' + page, root), 'utf8');
    assert.match(html, /<header class="top">/);
    assert.match(html, /paper-motion-v1\.css[\s\S]*legal-v2\.css/);
    assert.doesNotMatch(html, /paper-v1\.css|\/legal\.css|<span>P<\/span>/);
    assert.deepEqual(footerLinks(html), footerLinks(index));
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

test('APKPure is the working store download wherever the Google Play badge appears', async () => {
  for (const page of ['index.html', 'privacy.html', 'account-deletion.html']) {
    const html = await readFile(new URL('site/' + page, root), 'utf8');
    const links = [...html.matchAll(/<a\b[^>]*data-apkpure-link[^>]*>/g)].map((m) => m[0]);
    assert.ok(links.length >= 2, `${page} needs APKPure in header and footer`);
    for (const link of links) assert.match(link, /href="https:\/\/apkpure\.com\/picket\/com\.picket\.mobile"/);
  }
  const index = await readFile(new URL('site/index.html', root), 'utf8');
  const header = index.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? '';
  assert.doesNotMatch(header, /data-apkpure-link|data-play-link/);
  assert.equal((index.match(/data-apkpure-link/g) ?? []).length, 3);
});

test('every asset referenced by the landing and policy pages exists', async () => {
  const { access } = await import('node:fs/promises');
  for (const page of ['index.html', 'privacy.html', 'account-deletion.html']) {
    const html = await readFile(new URL('site/' + page, root), 'utf8');
    for (const [, file] of html.matchAll(/(?:src|href)="\/(launch-assets\/[^"?#]+)"/g)) await access(new URL('site/' + file, root));
  }
});

test('footer shows stores and social networks as logos only', async () => {
  for (const page of ['index.html', 'privacy.html', 'account-deletion.html']) {
    const footer = (await readFile(new URL('site/' + page, root), 'utf8')).match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';
    assert.doesNotMatch(footer, />\s*(Tải trên APKPure|Facebook|YouTube)\s*<\/a>/);
    assert.match(footer, /class="social facebook"[^>]*aria-label="[^"]+"><svg/);
    assert.match(footer, /class="social youtube"[^>]*aria-label="[^"]+"><svg/);
    assert.match(footer, /<div class="store-badges"><a[^>]*data-apkpure-link><img[^>]*apkpure-badge-vi\.svg[^>]*><\/a><a[^>]*data-play-link><img/);
  }
});
