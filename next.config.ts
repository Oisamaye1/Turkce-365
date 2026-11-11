import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native module: keep it out of the bundler.
  serverExternalPackages: ["better-sqlite3", "node-notifier"],
  // Allow opening the dev server from a phone on the local network.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],
  // Writing correction / lesson generation can take a while through the CLI.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
