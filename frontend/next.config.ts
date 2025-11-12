import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "critiqit.io",
    "api.critiqit.io",
    "www.critiqit.io",
  ],
};

export default nextConfig;
