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
}

export default nextConfig
