import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // evita ruído em dev
  buildExcludes: [/middleware-manifest\.json$/],
})(nextConfig);
