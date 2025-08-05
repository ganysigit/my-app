import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  // Fix cross-origin warnings for development
  allowedDevOrigins: [
    '192.168.18.4:3001',
    'localhost:3001',
    '127.0.0.1:3001'
  ],
  
  // Optimize for better performance
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Ensure proper handling of environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  webpack: (config, { isServer, webpack }) => {
    // Replace zlib-sync with our mock for both client and server
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^zlib-sync$/,
        path.resolve(__dirname, 'lib/mocks/zlib-sync-mock.js')
      )
    );

    // Externalize Discord.js and related packages for server-side only
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'discord.js': 'commonjs discord.js',
        '@discordjs/ws': 'commonjs @discordjs/ws',
        '@discordjs/rest': 'commonjs @discordjs/rest',
        'zlib-sync': 'commonjs zlib-sync'
      });
    } else {
      // For client-side, completely ignore Discord.js
      config.resolve.alias = {
        ...config.resolve.alias,
        'discord.js': false,
        '@discordjs/ws': false,
        '@discordjs/rest': false,
        'zlib-sync': false
      };
    }

    // Add fallbacks for other optional dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'erlpack': false,
      'node:zlib': false,
      'node:util': false,
      'discord.js': false,
      '@discordjs/ws': false,
      '@discordjs/rest': false,
      'zlib-sync': false
    };

    return config;
  },
};

export default nextConfig;
