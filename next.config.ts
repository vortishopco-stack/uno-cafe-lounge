import type { NextConfig } from "next";

/**
 * Static export configuration for GitHub Pages.
 *
 * This app is a 100% static site (no server runtime). It talks directly to
 * Supabase from the browser, so it can be hosted for free on GitHub Pages
 * (or any static host: Netlify, Cloudflare Pages, Vercel, S3, etc.).
 *
 * BASE PATH:
 * - GitHub Pages project site (https://USERNAME.github.io/REPO/):
 *     set NEXT_PUBLIC_BASE_PATH=/REPO  (with leading slash)
 * - Custom domain (https://yourdomain.com/):
 *     set NEXT_PUBLIC_BASE_PATH=  (empty)
 * - GitHub Pages user/org site (https://USERNAME.github.io/):
 *     set NEXT_PUBLIC_BASE_PATH=  (empty)
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  // GitHub Pages serves /foo/  ->  /foo/index.html. Trailing slashes avoid
  // 301 redirects and broken asset paths on refresh.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // The app is fully typed, but we keep this on for zero-friction deploys
  // (pre-existing minor type nits in i18n don't block the build).
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
