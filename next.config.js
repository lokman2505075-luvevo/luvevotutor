/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  async redirects() {
    return [
      {
        source: '/book-course-affiliate',
        destination: '/educational-product',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
