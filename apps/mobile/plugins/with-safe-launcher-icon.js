const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

// Preserve the artwork; keep text and corners inside adaptive launcher masks.
module.exports = function withSafeLauncherIcon(config) {
  return withDangerousMod(config, ["android", async mod => {
    const res = path.join(mod.modRequest.platformProjectRoot, "app/src/main/res");
    await fs.mkdir(path.join(res,"drawable"), { recursive: true });
    await fs.writeFile(path.join(res,"drawable/picket_launcher_safe.xml"),
      '<inset xmlns:android="http://schemas.android.com/apk/res/android" android:drawable="@mipmap/ic_launcher_foreground" android:inset="18%" />\n');
    for (const file of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
      const target = path.join(res,"mipmap-anydpi-v26",file);
      const xml = await fs.readFile(target,"utf8");
      await fs.writeFile(target,xml.replace(/<foreground android:drawable="[^"]+"\s*\/>/,
        '<foreground android:drawable="@drawable/picket_launcher_safe"/>'));
    }
    return mod;
  }]);
};
