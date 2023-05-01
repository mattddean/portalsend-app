// validate environment variables on build
import "./src/env.mjs";

import mdx from "@next/mdx";
import remarkGfm from "remark-gfm";
import { env } from "./src/env.mjs";

/** @type {import("next").NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "js", "jsx", "mdx"],
  experimental: {
    appDir: true,
    typedRoutes: true,
  },
  eslint: { ignoreDuringBuilds: !!env.CI },
  typescript: { ignoreBuildErrors: !!env.CI },
};

const withMdx = mdx({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
});

export default withMdx(nextConfig);
