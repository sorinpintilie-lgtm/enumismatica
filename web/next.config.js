/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['shared'],

  webpack: (config, { isServer }) => {
    const path = require('path');
    
    // Add path aliases for shared folder with proper module resolution
    config.resolve.alias['shared'] = path.resolve(__dirname, '../shared');
    
    // Ensure proper ES module handling for shared package
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    
    return config;
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;