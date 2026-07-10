// @ts-check
/**
 * @type {import('next').NextConfig}
 */

import createNextIntlPlugin from "next-intl/plugin";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  async redirects() {
    return [
      {
        source: "/stories",
        destination: "/stats",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  experimental: {
    optimizeCss: false, // disable LightningCSS
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
