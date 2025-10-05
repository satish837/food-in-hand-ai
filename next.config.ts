import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow specific external origins to request /_next resources during development
  // This prevents cross-origin dev requests (like FullStory replay) from breaking HMR
  allowedDevOrigins: [
    'https://edge.fullstory.com',
    'https://544ec961dcd04dbf8fdd1470db88de00-9daa1fdb-455b-4da7-8988-69d426.fly.dev'
  ],
};

export default nextConfig;
