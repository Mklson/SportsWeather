/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Old default Vercel domain and the secondary aeroute.online brand
      // domain both fold into the one canonical aeroute.no URL instead of
      // serving duplicate content. The aeroute.no <-> www.aeroute.no pairing
      // is handled by Vercel's own domain-redirect setting, not here — doing
      // it in both places risks an infinite redirect loop if they ever
      // disagree on direction.
      {
        source: "/:path*",
        has: [{ type: "host", value: "sports-weather.vercel.app" }],
        destination: "https://aeroute.no/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "aeroute.online" }],
        destination: "https://aeroute.no/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.aeroute.online" }],
        destination: "https://aeroute.no/:path*",
        permanent: true,
      },
    ];
  },
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
    ],
  },
};

export default nextConfig;
