// Deterministic asset conversion: use the existing Picket artwork, not a new logo.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const png = await sharp(await readFile(new URL('../public/picket-logo.png', import.meta.url)))
  .resize(64, 64, { fit: 'contain', background: '#fff8f0' }).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); // ICO type
header.writeUInt16LE(1, 4); // one PNG-backed icon
header[6] = 64;
header[7] = 64;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(new URL('../src/app/favicon.ico', import.meta.url), Buffer.concat([header, png]));
