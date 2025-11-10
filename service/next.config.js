/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
    };
    config.resolve.extensions = [
      '.web.js',
      '.web.ts',
      '.web.tsx',
      ...config.resolve.extensions,
    ];

    // Ignore pdf-parse test files during build
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'canvas': 'commonjs canvas',
      });
    }

    return config;
  },
};

module.exports = nextConfig;
