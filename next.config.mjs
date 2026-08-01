/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["xml2js", "fit-file-parser"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.mapbox.com" },
      { protocol: "https", hostname: "api.met.no" },
      // Garmin's own dynamically-updated brand asset CDN — their developer
      // guidelines explicitly ask third parties to hotlink these rather than
      // self-host a downloaded copy.
      { protocol: "https", hostname: "static.garmincdn.com" },
      // AllTrails' own self-hosted app icon (their site's apple-touch-icon path).
      { protocol: "https", hostname: "www.alltrails.com" },
      // Kartverket's own self-hosted apple-touch-icon.
      { protocol: "https", hostname: "www.kartverket.no" },
    ],
  },
};

export default nextConfig;
