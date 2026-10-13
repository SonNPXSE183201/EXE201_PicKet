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

module.exports = config;
