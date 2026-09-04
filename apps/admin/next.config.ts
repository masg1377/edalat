import path from 'node:path'

import type { NextConfig } from 'next'

// Turbopack's resolveAlias wants values relative to this file's directory
// (an absolute path is mishandled as a bogus "server relative import"), so
// resolve each target with require.resolve and rewrite it relative to here.
const reactAlias = (specifier: string) => {
  const relative = path.relative(__dirname, require.resolve(specifier))
  return relative.startsWith('.') ? relative : `./${relative}`
}

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  // Pin the monorepo root explicitly, same reasoning as apps/web/next.config.mjs:
  // without this Next infers it from the nearest lockfile, which in an npm
  // workspace can resolve outside this app's directory.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  // apps/admin pins React 18 locally (Vuexy's @menu vendor code isn't typed
  // for React 19 yet) while the monorepo root hoists React 19 for apps/web.
  // Without this, hoisted deps under root node_modules (react-hook-form,
  // some MUI internals, etc.) resolve `react`/`react-dom` to the root copy
  // while admin's own source resolves to its local copy — two physical
  // React instances in one bundle, which breaks React's internal
  // singletons (e.g. ReactCurrentDispatcher) at runtime. Forcing every
  // resolution in this app's Turbopack graph to admin's own local copy
  // fixes it without touching Vuexy's vendored code or bumping React's
  // major version here.
  experimental: {
    turbo: {
      resolveAlias: {
        react: reactAlias('react'),
        'react-dom': reactAlias('react-dom'),
        'react/jsx-runtime': reactAlias('react/jsx-runtime'),
        'react/jsx-dev-runtime': reactAlias('react/jsx-dev-runtime')
      }
    }
  },
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
