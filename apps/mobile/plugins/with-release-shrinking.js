const { withDangerousMod, withGradleProperties } = require("@expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

/* Turns on R8 code shrinking/optimization and resource shrinking for release builds
   (Google Play warns when DEX is not optimized) and keeps Picket's reflection-based
   classes. Debug/dev-client builds are unaffected. */
const PROPERTIES = {
  "android.enableMinifyInReleaseBuilds": "true",
  "android.enableShrinkResourcesInReleaseBuilds": "true",
};
const BEGIN = "# BEGIN picket-release-shrinking";
const END = "# END picket-release-shrinking";

function setProperties(items) {
  const keys = new Set(Object.keys(PROPERTIES));
  const kept = items.filter((item) => !(item.type === "property" && keys.has(item.key)));
  return [...kept, ...Object.entries(PROPERTIES).map(([key, value]) => ({ type: "property", key, value }))];
}

function mergeRules(existing, rules) {
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);
  const base = start >= 0 && end > start ? existing.slice(0, start) + existing.slice(end + END.length) : existing;
  return `${base.trimEnd()}\n\n${BEGIN}\n${rules.trim()}\n${END}\n`;
}

module.exports = function withReleaseShrinking(config) {
  config = withGradleProperties(config, (mod) => {
    mod.modResults = setProperties(mod.modResults);
    return mod;
  });
  return withDangerousMod(config, ["android", async (mod) => {
    const target = path.join(mod.modRequest.platformProjectRoot, "app", "proguard-rules.pro");
    const rules = await fs.readFile(path.join(__dirname, "android", "proguard-picket.pro"), "utf8");
    const existing = await fs.readFile(target, "utf8").catch(() => "");
    await fs.writeFile(target, mergeRules(existing, rules));
    return mod;
  }]);
};

module.exports.setProperties = setProperties;
module.exports.mergeRules = mergeRules;
