// @ts-check
/**
 * @type {import('next').NextConfig}
 */

import createNextIntlPlugin from "next-intl/plugin";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  experimental: {
    optimizeCss: false, // disable LightningCSS
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
