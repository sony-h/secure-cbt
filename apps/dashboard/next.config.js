/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@secure-cbt/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
