import mdx from "@next/mdx";
import remarkGfm from "remark-gfm";

/** @type {import("next").NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "js", "jsx", "mdx"],
  experimental: {
    appDir: true,
    typedRoutes: true,
  },
  eslint: { ignoreDuringBuilds: !!process.env.CI },
  typescript: { ignoreBuildErrors: !!process.env.CI },
};

const withMdx = mdx({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
});

export default withMdx(nextConfig);
