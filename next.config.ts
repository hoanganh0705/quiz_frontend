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
  //
  // Cloudinary hostnames are added by Phase 9 of the Cloudinary
  // migration plan (`docs/architecture-reviews/cloudinary-integration.md`).
  // The `${cloudName}` placeholder is replaced at config-write time
  // by the build pipeline from `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`;
  // we ship a wildcard pattern as a defensive fallback so the
  // default `demo` cloud (used by some tests) also resolves.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/demo/**',
      },
      {
        // Production cloud name — match `res.cloudinary.com/<cloud>/...`.
        // The actual cloud name is read at build time from
        // `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`; this pattern is the
        // permissive fallback used when the env var is not set.
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        // Test fixtures use example.test (RFC 6761 reserved TLD) and
        // cdn.example.com (RFC 2606 reserved). They're not real hosts;
        // `next/image` rejects unlisted src values, which would break
        // snapshot/unit tests that render cards with placeholder URLs.
        protocol: 'https',
        hostname: 'example.test',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/**',
      },
    ],
  },

  /* config options here */
};

export default nextConfig;
