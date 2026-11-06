import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderRelease, validateRelease, verifyApkBytes } from '../src/release.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const release = validateRelease(JSON.parse(await readFile(path.join(root, 'release.json'), 'utf8')));
const apkPath = process.env.PICKET_APK;
if (!apkPath) throw new Error('Set PICKET_APK to the verified, signed ARM64 production APK.');
const apk = await readFile(apkPath);
verifyApkBytes(release, apk);
const output = path.join(root, 'dist');
await mkdir(path.join(output, 'downloads'), { recursive:true });
await cp(path.join(root, 'site', 'launch-assets'), path.join(output, 'launch-assets'), { recursive:true });
// CSS/JS keep stable names but change content between landing versions, and
// Caddy lets browsers cache them for hours: tag each with its content hash so a
// new page never runs with an old stylesheet or script.
const versionAssets = async (html) => {
  let out = html;
  for (const [ref, file] of new Map([...html.matchAll(/"(\/launch-assets\/([\w.-]+\.(?:css|js)))"/g)].map((m) => [m[1], m[2]]))) {
    const hash = createHash('sha256').update(await readFile(path.join(root, 'site', 'launch-assets', file))).digest('hex').slice(0, 10);
    out = out.replaceAll(`"${ref}"`, `"${ref}?v=${hash}"`);
  }
  return out;
};
const html = renderRelease(await readFile(path.join(root,'site','index.html'),'utf8'), release);
await writeFile(path.join(output, 'index.html'), await versionAssets(html));
for (const page of ['privacy.html', 'account-deletion.html']) {
  // Policy pages share the landing header/footer, including the APK link token.
  await writeFile(path.join(output, page), await versionAssets(renderRelease(await readFile(path.join(root, 'site', page), 'utf8'), release)));
}
await writeFile(path.join(output, 'release.json'), JSON.stringify(release, null, 2) + '\n');
await writeFile(path.join(output, 'downloads', release.filename), apk);
await writeFile(path.join(output, 'downloads', release.filename + '.sha256'), release.sha256 + '  ' + release.filename + '\n');
console.log(`Landing built with verified ${release.filename} (${release.bytes} bytes).`);
