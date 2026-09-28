import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
  transpilePackages: [
    "@picket/api-client",
    "@picket/design-tokens",
    "@picket/domain",
  ],
};

export default nextConfig;
