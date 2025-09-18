// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/",
        has: [
          {
            type: "header",
            key: "host",
            value: "genderaffirming\\.ai",
          },
        ],
        destination: "/affirm",
      },
      {
        source: "/chat",
        has: [
          {
            type: "header",
            key: "host",
            value: "genderaffirming\\.ai",
          },
        ],
        destination: "/affirm/chat",
      },
      {
        source: "/prompts",
        has: [
          {
            type: "header",
            key: "host",
            value: "genderaffirming\\.ai",
          },
        ],
        destination: "/affirm/prompts",
      },
      {
        source: "/terms",
        has: [
          {
            type: "header",
            key: "host",
            value: "genderaffirming\\.ai",
          },
        ],
        destination: "/affirm/terms",
      },
      {
        source: "/contact",
        has: [
          {
            type: "header",
            key: "host",
            value: "genderaffirming\\.ai",
          },
        ],
        destination: "/affirm/contact",
      },
    ];
  },
};

export default nextConfig;
