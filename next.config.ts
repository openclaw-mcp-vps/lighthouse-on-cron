import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["lighthouse", "chrome-launcher"],
  images: {
    remotePatterns: []
  }
};

export default nextConfig;
