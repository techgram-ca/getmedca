import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  { ignores: [".next/**", "node_modules/**", "public/sw.js"] },
  {
    rules: {
      "react/no-unescaped-entities": "off",
      // App Router layouts load Google Fonts via <link>; this rule targets the Pages Router.
      "@next/next/no-page-custom-font": "off",
    },
  },
];

export default config;
