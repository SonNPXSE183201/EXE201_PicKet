import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const updatesDir = path.join(mobileRoot, "src", "features", "updates");
const playBindings = path.join(updatesDir, "android-app-updates.play.ts");

type Resolution = { filePath: string; type: string };
type Context = { originModulePath: string; resolveRequest: (context: Context, name: string, platform: string) => Resolution };
type Resolver = (context: Context, name: string, platform: string) => Resolution;

function loadMetroResolver(playBuild: boolean): Resolver | undefined {
  const configPath = require.resolve("../../../metro.config.js");
  const previous = process.env.PICKET_PLAY_BUILD;
  if (playBuild) process.env.PICKET_PLAY_BUILD = "1";
  else delete process.env.PICKET_PLAY_BUILD;
  try {
    delete require.cache[configPath];
    return require(configPath).resolver.resolveRequest;
  } finally {
    if (previous === undefined) delete process.env.PICKET_PLAY_BUILD;
    else process.env.PICKET_PLAY_BUILD = previous;
    delete require.cache[configPath];
  }
}

const fallthrough: Resolution = { filePath: "default", type: "sourceFile" };
const contextFor = (origin: string): Context => ({ originModulePath: origin, resolveRequest: () => fallthrough });

test("Play builds give every updates-folder importer the Play bindings", () => {
  const resolve = loadMetroResolver(true);
  assert.ok(resolve, "Play builds must install a custom resolver");
  for (const file of ["use-app-update.tsx", "app-update-banner.tsx", "app-update-gate.tsx", "installed-version.tsx", "some-future-file.ts"]) {
    assert.deepEqual(resolve(contextFor(path.join(updatesDir, file)), "./android-app-updates", "android"),
      { filePath: playBindings, type: "sourceFile" }, file);
  }
});

test("Play builds leave other importers and modules to the default resolver", () => {
  const resolve = loadMetroResolver(true)!;
  const elsewhere = path.join(mobileRoot, "src", "features", "settings", "screen.tsx");
  assert.equal(resolve(contextFor(elsewhere), "./android-app-updates", "android"), fallthrough);
  assert.equal(resolve(contextFor(path.join(updatesDir, "use-app-update.tsx")), "./update-types", "android"), fallthrough);
  const nested = path.join(updatesDir, "nested", "file.tsx");
  assert.equal(resolve(contextFor(nested), "./android-app-updates", "android"), fallthrough);
});

test("direct APK builds keep Metro's default resolver", () => {
  assert.equal(loadMetroResolver(false) ?? null, null);
});

test("Play builds also swap the alias import used by announcements", () => {
  const resolve = loadMetroResolver(true)!;
  const announcements = path.join(mobileRoot, "src", "features", "announcements", "announcements-context.tsx");
  assert.deepEqual(resolve(contextFor(announcements), "@/features/updates/android-app-updates", "android"),
    { filePath: playBindings, type: "sourceFile" });
});
