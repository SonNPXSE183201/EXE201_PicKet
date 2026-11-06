import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
test("Play build resolves billing to Play implementation regardless of remote flags", () => {
  const exports = { exports: {} } as {
    exports: {
      resolver?: {
        resolveRequest: (
          context: unknown,
          name: string,
          platform: string,
        ) => { filePath: string };
      };
    };
  };
  vm.runInNewContext(readFileSync("metro.config.js", "utf8"), {
    __dirname: process.cwd(),
    module: exports,
    process: { env: { PICKET_PLAY_BUILD: "1" } },
    require: (name: string) => {
      if (name === "expo/metro-config")
        return { getDefaultConfig: () => ({ resolver: {} }) };
      if (name === "node:path") return path;
      if (name === "node:fs") return { realpathSync: (p: string) => p };
      throw new Error(name);
    },
  });
  const result = exports.exports.resolver!.resolveRequest(
    {
      resolveRequest: () => {
        throw new Error("must select Play adapter");
      },
    },
    "@/features/billing/billing-entry",
    "android",
  );
  assert.ok(result.filePath.endsWith("billing-entry.play.tsx"));
  const entry = readFileSync(result.filePath, "utf8");
  assert.match(entry, /from '\.\/play-billing-screen'/);
  assert.doesNotMatch(
    readFileSync("src/features/billing/play-billing-screen.tsx", "utf8"),
    /payos-billing-screen|paymentCheckout/,
  );
});
