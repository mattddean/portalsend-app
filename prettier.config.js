/** @type {import("prettier").Config} */
module.exports = {
  printWidth: 140,
  trailingComma: "all",
  plugins: [require.resolve("prettier-plugin-tailwindcss")],
  tailwindConfig: "./tailwind.config.cjs",
};
