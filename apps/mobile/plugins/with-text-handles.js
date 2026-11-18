const { withAndroidStyles, withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

// Android's stock caret/selection handles are large and teal on many skins (MIUI).
// Use small brand-coloured handles; React Native re-tints them per input when
// `selectionHandleColor` is set.
const BRAND = "#9B3E60";
const vector = (w, h, d) => `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${w}dp" android:height="${h}dp" android:viewportWidth="${w}" android:viewportHeight="${h}">
  <path android:fillColor="${BRAND}" android:pathData="${d}" />
</vector>
`;
const HANDLES = {
  // Teardrop under the caret, tip pointing up at the cursor.
  picket_text_handle_middle: vector(16, 20, "M8,1 L12.5,8.1 A6,6 0 1,1 3.5,8.1 Z"),
  // Selection start: square-ish drop with its corner at the top-right.
  picket_text_handle_left: vector(14, 14, "M14,0 L14,7 A7,7 0 1,1 7,0 Z"),
  // Selection end: mirror image, corner at the top-left.
  picket_text_handle_right: vector(14, 14, "M0,0 L7,0 A7,7 0 1,1 0,7 Z"),
};

function setItem(style, name, value) {
  style.item = (style.item ?? []).filter(item => item.$.name !== name);
  style.item.push({ $: { name }, _: value });
}

module.exports = function withTextHandles(config) {
  config = withDangerousMod(config, ["android", async mod => {
    const dir = path.join(mod.modRequest.platformProjectRoot, "app/src/main/res/drawable");
    await fs.mkdir(dir, { recursive: true });
    for (const [name, xml] of Object.entries(HANDLES)) await fs.writeFile(path.join(dir, `${name}.xml`), xml);
    return mod;
  }]);
  return withAndroidStyles(config, mod => {
    const theme = mod.modResults.resources.style?.find(style => style.$.name === "AppTheme");
    if (theme) {
      setItem(theme, "colorAccent", BRAND);
      setItem(theme, "colorControlActivated", BRAND);
      setItem(theme, "android:textSelectHandle", "@drawable/picket_text_handle_middle");
      setItem(theme, "android:textSelectHandleLeft", "@drawable/picket_text_handle_left");
      setItem(theme, "android:textSelectHandleRight", "@drawable/picket_text_handle_right");
    }
    return mod;
  });
};
