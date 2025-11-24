/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better optimization
  experimental: {
    optimizePackageImports: ['@tanstack/react-query'],
  },

  // Output configuration for Netlify static export
  output: 'standalone',

  // Configure webpack for better tree shaking
  webpack: (config, { isServer }) => {
    const path = require('path');
    
    // Add path aliases
    config.resolve.alias['@/shared'] = path.resolve(__dirname, '../shared');
    
    // Ensure Firebase is resolved from web's node_modules
    config.resolve.alias['firebase'] = path.resolve(__dirname, 'node_modules/firebase');
    
    // Add shared folder to module resolution
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../shared')
    ];

    // Optimize chunks
    if (!isServer) {
      config.optimization.splitChunks.chunks = 'all';
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        firebase: {
          test: /[\\/]node_modules[\\/]firebase[\\/]/,
          name: 'firebase',
          chunks: 'all',
          priority: 10,
        },
        reactquery: {
          test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/,
          name: 'react-query',
          chunks: 'all',
          priority: 10,
        },
      };
    }

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