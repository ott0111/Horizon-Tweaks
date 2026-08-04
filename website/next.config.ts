const path = require('path');

const nextConfig = {
  webpack(config) {
    config.resolve.modules.push(path.resolve(__dirname, 'node_modules'));
    config.resolve.alias['framer-motion'] = path.resolve(__dirname, 'node_modules/framer-motion');
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
