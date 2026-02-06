import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Bundle optimization: Avoid barrel file imports (bundle-barrel-imports)
  // This automatically transforms barrel imports to direct imports
  experimental: {
    optimizePackageImports: ['lucide-react']
  }
  /* config options here */
};

export default nextConfig;
