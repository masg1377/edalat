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
        destination: '/home',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig
