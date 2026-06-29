/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@secure-cbt/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'minio.example.com' },
      { protocol: 'http', hostname: 'localhost', port: '9000' },
    ],
  },
};

module.exports = nextConfig;
