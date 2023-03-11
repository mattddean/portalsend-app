// @ts-check

/* eslint-disable @typescript-eslint/no-var-requires */
const { env } = require("./server/env");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    runtime: "experimental-edge",
    appDir: true,
  },
  typescript: {
    // TODO: turn this off once we get things more stable
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
