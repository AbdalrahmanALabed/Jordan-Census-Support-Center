import type { NextConfig } from "next";

const basePath = "/Support_Center";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
