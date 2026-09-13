import type { NextConfig } from "next";

const basePath = "/Support_Center";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  allowedDevOrigins: ["10.109.10.13", "localhost", "127.0.0.1"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
