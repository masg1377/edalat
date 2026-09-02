export type PrimaryColorConfig = {
  name?: string
  light?: string
  main: string
  dark?: string
}

// Primary color config object
//
// Brand palette source: apps/web/src/app/globals.css (`--color-brand-*`,
// `--color-ink-*`, `--color-sand`) — the Figma-derived tokens for the
// storefront. `primary-1` is the CTA yellow used everywhere on the storefront
// (bg-brand-500 + text-ink-900); it's first because
// `settingsContext.tsx` defaults `settings.primaryColor` to
// `primaryColorConfig[0].main`, so it's the color the admin panel boots with.
// The remaining four are not designed from scratch — they're the neighboring
// shades of the same three brand tokens (brand-600/700, ink-400/600/800,
// sand), so switching swatches in the customizer never leaves the brand
// palette. See claude/وضعیت-پیاده‌سازی.md, فاز ۹الف.
const primaryColorConfig: PrimaryColorConfig[] = [
  {
    name: 'primary-1',
    light: '#FFE533', // brand-400
    main: '#FEDD00', // brand-500 — storefront CTA yellow
    dark: '#D9BC00' // brand-600
  },
  {
    name: 'primary-2',
    light: '#7C7671', // ink-400
    main: '#4E4B47', // ink-600 — storefront dark-surface ink
    dark: '#2A2825' // ink-800
  },
  {
    name: 'primary-3',
    light: '#E7E4E2', // sand, lightened
    main: '#E1DDDB', // sand — storefront search-bar / muted-button background
    dark: '#CBC7C5' // sand, darkened
  },
  {
    name: 'primary-4',
    light: '#FEDD00', // brand-500
    main: '#D9BC00', // brand-600
    dark: '#A68F00' // brand-700
  },
  {
    name: 'primary-5',
    light: '#A9A39D', // ink-300
    main: '#605B56', // ink-500
    dark: '#3C3936' // ink-700
  }
]

export default primaryColorConfig
