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

if (process.env.PICKET_PLAY_BUILD === "1") {
  const playUpdates = path.join(
    projectRoot,
    "src/features/updates/android-app-updates.play.ts",
  );
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "@/features/billing/billing-entry") {
      return {filePath:path.join(projectRoot,"src/features/billing/billing-entry.play.tsx"),type:"sourceFile"};
    }
    if (
      moduleName === "./android-app-updates" &&
      context.originModulePath.endsWith(
        path.join("features", "updates", "app-update-section.tsx"),
      )
    ) {
      return { filePath: playUpdates, type: "sourceFile" };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
