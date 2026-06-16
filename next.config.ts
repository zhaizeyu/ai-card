import type { NextConfig } from "next"

const nextConfig: NextConfig = {
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
