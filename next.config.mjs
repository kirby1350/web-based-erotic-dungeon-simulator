/** @type {import('next').NextConfig} */
// Set DZMM_BUILD=1 to produce a static export (out/) for the DZMM platform.
// In that build the server routes under app/api must be excluded (the on-platform
// app talks to window.dzmm, not /api/*).
const isStaticExport = process.env.DZMM_BUILD === '1'

const nextConfig = {
  ...(isStaticExport ? { output: 'export' } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Serve the pure-JS static port (public/publish/) at a clean /publish URL.
  // Rewrites aren't supported under `output: 'export'`, so only add them for the
  // normal server build (self-host). In export mode the file is reachable at
  // /publish/index.html directly.
  ...(isStaticExport ? {} : {
    async rewrites() {
      return [{ source: '/publish', destination: '/publish/index.html' }]
    },
  }),
}

export default nextConfig
