// @ts-check

const withMDX = require("@next/mdx")({
  extension: /\.mdx?$/,
});

/** @type {import('next').NextConfig} */
module.exports = withMDX({
  reactStrictMode: true,
  experimental: {
    appDir: true,
    typedRoutes: true,
  },
  typescript: {
    // TODO: turn this off once we get things more stable
    ignoreBuildErrors: true,
  },
});
