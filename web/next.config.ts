import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
  experimental: {
    // Keep visited/prefetched screens in the client cache for 5 minutes so
    // switching admin tabs is instant. Freshness comes from realtime pushes
    // (router.refresh on the open screen, stale-while-revalidate for others)
    // and from server actions (revalidatePath).
    staleTimes: { dynamic: 300, static: 300 },
  },
  transpilePackages: [
    "@picket/api-client",
    "@picket/design-tokens",
    "@picket/domain",
  ],
};

export default nextConfig;
