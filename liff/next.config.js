/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['dl.line-scdn.net'],
  },
  env: {
    NEXT_PUBLIC_LIFF_ID: process.env.LIFF_ID,
  },
}

module.exports = nextConfig
