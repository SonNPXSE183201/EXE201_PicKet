const fs = require("node:fs");
const path = require("node:path");

/**
 * Wraps app.json (versions and plugins stay there). Firebase Phone Auth for SMS
 * sign-up is added only when google-services.json exists, so builds keep
 * working before the file is provided; the JS side then hides SMS sign-up.
 * The file must list clients for com.picket.mobile and com.picket.mobile.bugqa
 * (QA builds switch applicationId through bugqa.init.gradle).
 */
function googleServicesFile() {
  const candidates = [process.env.GOOGLE_SERVICES_JSON, "./google-services.json"].filter(Boolean);
  for (const candidate of candidates) {
    const absolute = path.resolve(__dirname, candidate);
    if (fs.existsSync(absolute)) return path.relative(__dirname, absolute).split(path.sep).join("/") || absolute;
  }
  return null;
}

module.exports = ({ config }) => {
  const servicesFile = googleServicesFile();
  const plugins = [
    ...(config.plugins ?? []),
    ["expo-build-properties", { android: { minSdkVersion: 24 } }],
    ...(servicesFile ? ["@react-native-firebase/app", "@react-native-firebase/auth"] : []),
  ];
  return {
    ...config,
    android: {
      ...config.android,
      ...(servicesFile ? { googleServicesFile: servicesFile.startsWith(".") || path.isAbsolute(servicesFile) ? servicesFile : `./${servicesFile}` } : {}),
    },
    plugins,
  };
};
