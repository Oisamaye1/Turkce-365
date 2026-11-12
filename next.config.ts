import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Database drivers / native helpers stay out of the bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "node-notifier"],
  // Allow opening the dev server from a phone on the local network.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
