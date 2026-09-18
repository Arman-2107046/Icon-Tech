import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components: `use cache` + cacheTag()/updateTag() drive all caching.
  // Runtime data (cookies, searchParams) must sit inside a Suspense boundary.
  cacheComponents: true,
};

export default nextConfig;
