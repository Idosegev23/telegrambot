/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['node-telegram-bot-api'],
  },
  images: {
    domains: [
      'media.api-sports.io',
      'logos.footystats.org',
      'apiv3.apifootball.com',
      'ythsmnqclosoxiccchhh.supabase.co', // Supabase storage
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/telegram/webhook/:botId',
        destination: '/api/telegram/webhook?botId=:botId',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
};

module.exports = nextConfig; 