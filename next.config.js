import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
// trigger restart 7
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns", "lodash"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/sdc_seal.png',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
      },
    ];
  },
};

// Create PWA configuration
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  customWorkerDir: "worker",
  disable: true, // Disable next-pwa plugin so Vercel serves the static sw.js we committed to git!
  buildExcludes: [
    /middleware-manifest\.json$/,
    /^pages\/index\.html$/,
    /^index\.html$/,
  ],
  runtimeCaching: [
    {
      urlPattern: /^\/$/,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /^\/(.*)$/,
      handler: "NetworkOnly",
    },
  ],
})(nextConfig);

export default pwaConfig;
 
