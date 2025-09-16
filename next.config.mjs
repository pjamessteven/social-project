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
            value: "(?<host>genderaffirmation\\.ai)",
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
            value: "(?<host>genderaffirmation\\.ai)",
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
            value: "(?<host>genderaffirmation\\.ai)",
          },
        ],
        destination: "/affirm_prompts",
      },
      {
        source: "/terms",
        has: [
          {
            type: "header",
            key: "host",
            value: "(?<host>genderaffirmation\\.ai)",
          },
        ],
        destination: "/affirm_terms",
      },
      {
        source: "/contact",
        has: [
          {
            type: "header",
            key: "host",
            value: "(?<host>genderaffirmation\\.ai)",
          },
        ],
        destination: "/affirm_contact",
      },
    ];
  },
};

export default nextConfig;
