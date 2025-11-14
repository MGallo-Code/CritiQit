import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development: Allow local tunnels for Cloudflare domains
  allowedDevOrigins: [
    "critiqit.io",
    "api.critiqit.io",
    "www.critiqit.io",
  ],

  // Production: Standalone output for Docker deployment
  // Creates minimal production build in .next/standalone/
  output: 'standalone',
};

export default nextConfig;
