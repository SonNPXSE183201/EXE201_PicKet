const fs = require("node:fs");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

// Workspace dependencies are installed as Windows junctions. When the project
// is built through a short subst drive (used to keep native C++ object paths
// below the Windows limit), those junctions still resolve to the physical
// workspace path. Metro must be allowed to watch both views of the workspace.
const linkedDesignTokens = fs.realpathSync(
  path.join(projectRoot, "node_modules", "@picket", "design-tokens"),
);
const physicalWorkspaceRoot = path.resolve(linkedDesignTokens, "../..");

config.watchFolders = [
  ...new Set([
    ...(config.watchFolders ?? []),
    workspaceRoot,
    physicalWorkspaceRoot,
  ]),
];

// Matches files directly inside src/features/updates by suffix, so it also works
// when the project is opened through a subst drive or a junction.
function isInsideUpdates(originModulePath) {
  return path
    .dirname(path.normalize(originModulePath))
    .endsWith(path.join("src", "features", "updates"));
}

if (process.env.PICKET_PLAY_BUILD === "1") {
  const playUpdates = path.join(
    projectRoot,
    "src/features/updates/android-app-updates.play.ts",
  );
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "@/features/billing/billing-entry") {
      return {filePath:path.join(projectRoot,"src/features/billing/billing-entry.play.tsx"),type:"sourceFile"};
    }
    // Every importer inside src/features/updates gets the Play bindings, so the
    // APK installer module is never bundled into the Play build.
    if (
      moduleName === "@/features/updates/android-app-updates" ||
      (moduleName === "./android-app-updates" &&
        isInsideUpdates(context.originModulePath))
    ) {
      return { filePath: playUpdates, type: "sourceFile" };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
