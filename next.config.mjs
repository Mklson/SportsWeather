/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["xml2js"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mapbox.com" },
      { protocol: "https", hostname: "api.met.no" },
    ],
  },
};

export default nextConfig;
