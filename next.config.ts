import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // For GitHub Pages deployment, set NEXT_PUBLIC_BASE_PATH to your repo name
  // e.g., if your repo is at https://username.github.io/flavorpoints/
  // then set NEXT_PUBLIC_BASE_PATH=/flavorpoints
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
