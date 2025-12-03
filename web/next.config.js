/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['shared'],
  turbopack: {},
  images: {
    unoptimized: true,
  },
  // Performance optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  // Ensure static files are included in build
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../'),
  },

  webpack: (config, { isServer }) => {
    const path = require('path');
    
    // Add path aliases for shared folder with proper module resolution
    config.resolve.alias['shared'] = path.resolve(__dirname, '../shared');
    
    // Ensure proper ES module handling for shared package
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };

    // Ensure PostCSS processes CSS files
    const cssRule = config.module.rules.find(
      rule => rule.oneOf && rule.oneOf.find(r => r.test && r.test.toString().includes('css'))
    );
    
    if (cssRule && cssRule.oneOf) {
      cssRule.oneOf.forEach(rule => {
        if (rule.use && Array.isArray(rule.use)) {
          rule.use.forEach(loader => {
            if (loader.loader && loader.loader.includes('postcss-loader')) {
              loader.options = {
                ...loader.options,
                postcssOptions: {
                  config: path.resolve(__dirname, 'postcss.config.js'),
                },
              };
            }
          });
        }
      });
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
      {
        // Cache static assets aggressively
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache Firebase Storage images
        source: '/(.*)firebasestorage\\.googleapis\\.com/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache API responses
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      {
        // Cache dynamic pages for mobile
        source: '/((?!api|_next|favicon).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;