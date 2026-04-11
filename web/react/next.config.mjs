/** @type {import('next').NextConfig} */
const backend = process.env.API_BACKEND_URL || "http://localhost:8080"

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
    ]
  },
}

export default nextConfig
