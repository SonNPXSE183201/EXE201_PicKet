// Writes release.json from the release registry (admin "Phiên bản" page).
// The build step still verifies the APK bytes against this manifest.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseFromRegistry } from '../src/release.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = (process.env.PICKET_API_URL ?? 'https://api.picketfinance.com').replace(/\/$/, '');
if (!api.startsWith('https://') && !api.startsWith('http://localhost')) throw new Error('HTTPS API required.');
const response = await fetch(`${api}/v1/releases/landing`, { headers: { accept: 'application/json' } });
if (!response.ok) throw new Error(`Registry unavailable (${response.status}).`);
const next = releaseFromRegistry(await response.json());
const file = path.join(root, 'release.json');
const current = await readFile(file, 'utf8').catch(() => '');
const text = JSON.stringify(next, null, 2) + '\n';
if (current === text) console.log(`release.json already matches registry (${next.version}/${next.versionCode}).`);
else {
  await writeFile(file, text);
  console.log(`release.json updated from registry: ${next.version}/${next.versionCode}, ${next.filename}.`);
}
