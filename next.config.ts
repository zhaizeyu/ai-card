import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  allowedDevOrigins: ["card.animaseed.com"],
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/.opencode.json",
        destination: "/opencode.json",
      },
    ]
  },
}

export default nextConfig
