import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/** Read Unicode cmap coverage from the bundled font, without a font parser dependency. */
function glyph(font: Buffer, code: number): boolean {
  const count = font.readUInt16BE(4);
  let cmap = 0;
  for (let i = 0; i < count; i++) {
    const record = 12 + i * 16;
    if (font.toString("ascii", record, record + 4) === "cmap") cmap = font.readUInt32BE(record + 8);
  }
  assert.ok(cmap);
  const tables = font.readUInt16BE(cmap + 2);
  for (let i = 0; i < tables; i++) {
    const record = cmap + 4 + i * 8;
    const platform = font.readUInt16BE(record);
    if (platform !== 0 && platform !== 3) continue;
    const table = cmap + font.readUInt32BE(record + 4);
    const format = font.readUInt16BE(table);
    if (format === 12) {
      for (let j = 0; j < font.readUInt32BE(table + 12); j++) {
        const group = table + 16 + j * 12;
        const start = font.readUInt32BE(group), end = font.readUInt32BE(group + 4);
        if (code >= start && code <= end && font.readUInt32BE(group + 8) + code - start !== 0) return true;
      }
    }
    if (format !== 4 || code > 65535) continue;
    const segments = font.readUInt16BE(table + 6) / 2;
    const ends = table + 14, starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2, ranges = deltas + segments * 2;
    for (let j = 0; j < segments; j++) {
      const start = font.readUInt16BE(starts + j * 2), end = font.readUInt16BE(ends + j * 2);
      if (code < start || code > end) continue;
      const delta = font.readInt16BE(deltas + j * 2), range = font.readUInt16BE(ranges + j * 2);
      const raw = range ? font.readUInt16BE(ranges + j * 2 + range + (code - start) * 2) : code;
      if ((!range || raw !== 0) && ((raw + delta) & 65535) !== 0) return true;
    }
  }
  return false;
}

test("bundled display and handwriting fonts cover Vietnamese UI without mixed-font fallback", () => {
  const text = "Hôm nay của Bảo Những chiếc túi Chi tiêu Chụp Dự định Ăn uống Sức khỏe Thêm ngân sách 0123456789";
  for (const file of ["nunito-400.ttf", "nunito-600.ttf", "nunito-700.ttf", "nunito-800.ttf", "playwrite-vn.ttf"]) {
    const data = readFileSync(new URL(`../../../assets/fonts/${file}`, import.meta.url));
    for (const char of new Set(file.startsWith("nunito") ? text + "₫" : text)) assert.ok(glyph(data, char.codePointAt(0)!), `${file} missing ${char}`);
  }
});


test("number font contains the currency glyph used by Vietnamese balances", () => {
  const data = readFileSync(new URL("../../../assets/fonts/nunito-400.ttf", import.meta.url));
  for (const char of "0123456789₫.,−+") assert.ok(glyph(data, char.codePointAt(0)!), `Nunito missing ${char}`);
});


test("the bundled Android font faces have fixed and correct physical weights", () => {
  for (const weight of [400, 600, 700, 800]) {
    const data = readFileSync(new URL(`../../../assets/fonts/nunito-${weight}.ttf`, import.meta.url));
    const tables = new Map<string, number>();
    for (let i = 0; i < data.readUInt16BE(4); i++) {
      const record = 12 + i * 16;
      tables.set(data.toString("ascii", record, record + 4), data.readUInt32BE(record + 8));
    }
    assert.equal(tables.has("fvar"), false);
    assert.equal(data.readUInt16BE(tables.get("OS/2")! + 4), weight);
  }
});
