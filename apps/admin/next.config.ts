import path from 'node:path'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  // Pin the monorepo root explicitly, same reasoning as apps/web/next.config.mjs:
  // without this Next infers it from the nearest lockfile, which in an npm
  // workspace can resolve outside this app's directory.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/apps/ecommerce/products/list',
        // Not permanent: a 308 permanent redirect gets cached hard by the
        // browser (independent of the Next.js/Turbopack dev cache), so any
        // future change to this destination would silently keep sending
        // visitors to the OLD target until they clear site data. 307 keeps
        // this redirect live-editable during development.
        permanent: false,
        locale: false
      }
    ]
  }
}

export default nextConfig
