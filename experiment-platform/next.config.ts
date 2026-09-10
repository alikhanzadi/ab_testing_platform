import type { NextConfig } from "next";

// Set in CI when deploying to GitHub Pages, where the site is served from
// https://<user>.github.io/<repo> rather than the domain root. Left empty for
// local dev and for any host that serves the site at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // The whole app is client-side (state lives in localStorage), so it can ship
  // as a plain folder of static files with no server.
  output: "export",
  basePath,
  // GitHub Pages has no image optimizer.
  images: { unoptimized: true },
  // Emit /guide/index.html style paths so static hosts resolve routes directly.
  trailingSlash: true,
};

export default nextConfig;
