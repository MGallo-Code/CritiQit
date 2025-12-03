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
  // Note: Only enabled for production builds to avoid dev mode cache issues
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
};

export default nextConfig;
