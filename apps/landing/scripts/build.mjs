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
const html = renderRelease(await readFile(path.join(root,'site','index.html'),'utf8'), release);
await writeFile(path.join(output, 'index.html'), html);
for (const page of ['privacy.html', 'account-deletion.html']) {
  await cp(path.join(root, 'site', page), path.join(output, page));
}
await writeFile(path.join(output, 'release.json'), JSON.stringify(release, null, 2) + '\n');
await writeFile(path.join(output, 'downloads', release.filename), apk);
await writeFile(path.join(output, 'downloads', release.filename + '.sha256'), release.sha256 + '  ' + release.filename + '\n');
console.log(`Landing built with verified ${release.filename} (${release.bytes} bytes).`);
