import type { NextConfig } from "next";
import path from "node:path";
import { buildCsp } from "./src/core/security/csp";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: buildCsp({
          apiUrl: process.env.NEXT_PUBLIC_API_URL,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          dev: process.env.NODE_ENV !== "production",
        }) },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        // Caddy owns X-Content-Type-Options, Referrer-Policy and X-Frame-Options.
      ],
    }];
  },
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
