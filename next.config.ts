import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  // Bundle optimization: Avoid barrel file imports (bundle-barrel-imports)
  // This automatically transforms barrel imports to direct imports
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Allow seed-data images from Unsplash to render on the home page
  // (categories, tags, and user avatars use Unsplash URLs). Without
  // this allowlist, `next/image` throws an Invalid src prop error,
  // which the React error boundary catches and renders a "Something
  // went wrong!" page in place of the home content.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // Test fixtures use example.test (RFC 6761 reserved TLD) and
        // cdn.example.com (RFC 2606 reserved). They're not real hosts;
        // `next/image` rejects unlisted src values, which would break
        // snapshot/unit tests that render cards with placeholder URLs.
        protocol: "https",
        hostname: "example.test",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.example.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "example.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
    ],
  },

  serverExternalPackages: [
    "require-in-the-middle",
    "@opentelemetry/instrumentation",
  ],
  async redirects() {
    return [
      {
        source: "/achievement",
        destination: "/achievements",
        permanent: true,
      },
    ];
  },
  turbopack: {},
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /require-in-the-middle/ },
    ];
    return config;
  },
};

export default nextConfig;
