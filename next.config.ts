import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  // Bundle optimization: Avoid barrel file imports (bundle-barrel-imports)
  // This automatically transforms barrel imports to direct imports
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  // Allow seed-data images from Unsplash to render on the home page
  // (categories, tags, and user avatars use Unsplash URLs). Without
  // this allowlist, `next/image` throws an Invalid src prop error,
  // which the React error boundary catches and renders a "Something
  // went wrong!" page in place of the home content.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },

  /* config options here */
};

export default nextConfig;
