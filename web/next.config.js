/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // The landing page uses no `next/image` and does not host an image CDN, so
    // disable the Image Optimizer endpoint (/_next/image) entirely. This closes
    // the exposed optimizer surface that several Next.js advisories target
    // (GHSA-9g9p-9gw9-jx7f, GHSA-h64f-5h5j-jqjh, GHSA-3x4c-7xq6-9pq8, etc.)
    // while we run Next 14. Re-enable only when the app adopts next/image with
    // a locked-down remotePatterns allowlist and Next is upgraded.
    unoptimized: true,
  },
};

module.exports = nextConfig;
