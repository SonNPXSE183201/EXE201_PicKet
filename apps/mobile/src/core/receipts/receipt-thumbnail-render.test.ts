import assert from "node:assert/strict";
import test from "node:test";
import { renderReceiptThumbnail, type ThumbnailImage } from "./receipt-thumbnail-render";

function fixture(width = 600, height = 1200) {
  const released: string[] = [], removed: string[] = [], sizes: { width: number; height: number }[] = [];
  let renders = 0;
  const image = (name: string, w: number, h: number): ThumbnailImage => ({ width: w, height: h, release: () => { released.push(name); } });
  const context = { render: async () => ++renders === 1 ? image("source", width, height) : image("thumbnail", sizes[0].width, sizes[0].height),
    resize: (size: { width: number; height: number }) => { sizes.push(size); }, release: () => { released.push("context"); } };
  const save = async () => ({ uri: "file:///cache/new-thumbnail.jpg", base64: "c21hbGw=" });
  return { context, save, discard: (uri: string) => { removed.push(uri); }, released, removed, sizes };
}

test("portrait thumbnails bound both axes, preserve aspect and clean every native resource", async () => {
  const f = fixture();
  assert.equal(await renderReceiptThumbnail(f.context, f.save, f.discard), "data:image/jpeg;base64,c21hbGw=");
  assert.deepEqual(f.sizes, [{ width: 48, height: 96 }]);
  assert.deepEqual(f.released, ["thumbnail", "source", "context"]);
  assert.deepEqual(f.removed, ["file:///cache/new-thumbnail.jpg"]);
});

test("small images are not upscaled and extreme aspect ratios remain positive", async () => {
  const small = fixture(20, 30); await renderReceiptThumbnail(small.context, small.save, small.discard);
  assert.deepEqual(small.sizes, []); assert.deepEqual(small.released, ["source", "context"]);
  const extreme = fixture(1, 100_000); await renderReceiptThumbnail(extreme.context, extreme.save, extreme.discard);
  assert.deepEqual(extreme.sizes, [{ width: 1, height: 96 }]);
});

test("save/decode failures still release resources, missing encoding cleans its returned file", async () => {
  const f = fixture();
  await assert.rejects(renderReceiptThumbnail(f.context, async () => { throw new Error("save failed"); }, f.discard), /save failed/);
  assert.deepEqual(f.released, ["thumbnail", "source", "context"]);
  const missing = fixture();
  await assert.rejects(renderReceiptThumbnail(missing.context, async () => ({ uri: "file:///cache/partial.jpg" }), missing.discard), /encoding/i);
  assert.deepEqual(missing.removed, ["file:///cache/partial.jpg"]);
  const decode = fixture(); decode.context.render = async () => { throw new Error("decode failed"); };
  await assert.rejects(renderReceiptThumbnail(decode.context, decode.save, decode.discard), /decode failed/);
  assert.deepEqual(decode.released, ["context"]);
});

test("invalid dimensions and oversized encoded results fail closed, cleanup cannot hide the original error", async () => {
  for (const size of [[0, 1], [NaN, 1], [1, Infinity]]) {
    const f = fixture(...size as [number, number]);
    await assert.rejects(renderReceiptThumbnail(f.context, f.save, f.discard), /dimensions/i);
    assert.deepEqual(f.released, ["source", "context"]);
  }
  const f = fixture();
  f.context.release = () => { f.released.push("context"); throw new Error("release failed"); };
  await assert.rejects(renderReceiptThumbnail(f.context, async () => ({ uri: "file:///cache/large.jpg", base64: "a".repeat(131_073) }), () => { throw new Error("cleanup failed"); }), /encoding/i);
  assert.deepEqual(f.released, ["thumbnail", "source", "context"]);
});
