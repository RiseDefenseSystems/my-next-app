import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone directory for Docker deployments
  output: "standalone",
};

export default nextConfig;
