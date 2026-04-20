import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["lighthouse", "chrome-launcher"]
};

export default nextConfig;
