import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

const bytes = Buffer.from('signed APK fixture');
const valid = {
  version: '1.0.0', versionCode: 1, publishedAt: '2026-10-18',
  filename: 'picket-1.0.0-20261018-arm64.apk', abi: 'arm64-v8a', minSdk: 26,
  packageName: 'com.picket.mobile', bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
};
const api = () => import('../src/release.mjs');

test('accepts only a phone release and produces a local immutable download URL', async () => {
  const { validateRelease } = await api();
  assert.equal(validateRelease(valid).downloadUrl, '/downloads/' + valid.filename);
});
test('rejects emulator and foreign application packages', async () => {
  const { validateRelease } = await api();
  for (const change of [{ abi:'x86_64' }, { packageName:'com.picket.mobile.qa' }]) {
    assert.throws(() => validateRelease({ ...valid, ...change }));
  }
});
test('rejects traversal and external download filenames', async () => {
  const { validateRelease } = await api();
  for (const filename of ['../app.apk', 'https://evil.example/app.apk', 'a/b.apk', 'a\\b.apk', 'app.apk?x=1']) {
    assert.throws(() => validateRelease({ ...valid, filename }));
  }
});
test('requires real release metadata instead of placeholders', async () => {
  const { validateRelease } = await api();
  for (const change of [{ version:'latest' }, { versionCode:0 }, { publishedAt:'2026-02-31' }, { bytes:0 }, { minSdk:0 }, { sha256:'TODO' }]) {
    assert.throws(() => validateRelease({ ...valid, ...change }));
  }
});
test('verifies exact size and SHA-256 before exposing a download', async () => {
  const { verifyApkBytes } = await api();
  assert.doesNotThrow(() => verifyApkBytes(valid, bytes));
  assert.throws(() => verifyApkBytes(valid, Buffer.from('tampered')));
  assert.throws(() => verifyApkBytes({ ...valid, sha256:'0'.repeat(64) }, bytes));
});
test('renders truthful release data without unresolved tokens', async () => {
  const { renderRelease } = await api();
  const html = renderRelease('{{VERSION}} {{DOWNLOAD_URL}} {{SIZE_MB}} {{ANDROID_VERSION}} {{SHA256}} {{PUBLISHED_AT}}', valid);
  assert.match(html, /1\.0\.0/);
  assert.match(html, /Android 8\.0/);
  assert.ok(html.includes(valid.sha256));
  assert.ok(!html.includes('{{'));
  assert.throws(() => renderRelease('{{UNKNOWN}}', valid));
});
