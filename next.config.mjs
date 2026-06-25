/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'scontent.fmnl25-4.fna.fbcdn.net',
      },
    ],
  },
};

export default nextConfig;