const { withMainActivity } = require("@expo/config-plugins");

const override = `  override fun onNewIntent(intent: Intent) {
    // Retain the newest VIEW (or launcher) intent across Activity recreation.
    setIntent(intent)
    super.onNewIntent(intent)
  }`;

function injectCurrentActivityIntent(source) {
  if (/override\s+fun\s+onNewIntent\s*\(/.test(source)) {
    if (!source.includes(override)) throw new Error("Cannot replace an existing custom onNewIntent override");
    return source;
  }
  const signature = /class MainActivity\s*:\s*ReactActivity\(\)\s*\{/;
  if (!signature.test(source)) throw new Error("Cannot retain current intent: Kotlin MainActivity was not found");
  if (!/^import android\.content\.Intent\s*$/m.test(source)) {
    if (!/^package [\w.]+\s*$/m.test(source)) throw new Error("MainActivity package was not found");
    source = source.replace(/^(package [\w.]+)[ \t]*$/m, "$1\n\nimport android.content.Intent");
  }
  return source.replace(signature, match => `${match}\n${override}\n`);
}

module.exports = function withCurrentActivityIntent(config) {
  return withMainActivity(config, mod => {
    if (mod.modResults.language !== "kt") throw new Error("Picket current intent requires Kotlin MainActivity");
    mod.modResults.contents = injectCurrentActivityIntent(mod.modResults.contents);
    return mod;
  });
};
module.exports.injectCurrentActivityIntent = injectCurrentActivityIntent;
