import assert from "node:assert/strict";
import test from "node:test";
import { floatingActionBottom, floatingActionIconOnly } from "./floating-action-layout";

test("keeps FAB above navigation when text wraps at large font scales", () => {
  assert.ok(floatingActionBottom(1, 24) >= 100);
  assert.ok(floatingActionBottom(1.5, 24) >= 140);
  assert.ok(floatingActionBottom(2, 24) >= 180);
  assert.ok(floatingActionBottom(2, 48) > floatingActionBottom(2, 24));
});

test("extended FAB collapses at enlarged font or compact width without losing explicit icon-only mode", () => {
  assert.equal(floatingActionIconOnly(false,1,393),false);
  assert.equal(floatingActionIconOnly(false,1.49,360),false);
  assert.equal(floatingActionIconOnly(false,1.5,360),true);
  assert.equal(floatingActionIconOnly(false,2,393),true);
  assert.equal(floatingActionIconOnly(false,1,320),true);
  assert.equal(floatingActionIconOnly(true,1,393),true);
});
