/**
 * Product media lives in S3-compatible object storage (MinIO in development).
 *
 * The API may return either an absolute URL or a bare object key, depending on
 * how a product was imported. This adapter is the single place that resolves
 * either form into something `next/image` can load — components never build
 * storage URLs themselves, and no bucket host is hardcoded in a component.
 */

import { categoryAssets, productAssets } from './design-assets';

const PUBLIC_BASE = (process.env.NEXT_PUBLIC_MEDIA_URL ?? '').replace(/\/+$/, '');

/** Local placeholder shown whenever a product has no usable image. */
export const PRODUCT_IMAGE_PLACEHOLDER = '/placeholders/product.svg';

export function resolveMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^(https?:)?\/\//.test(value) || value.startsWith('data:')) return value;
  if (value.startsWith('/')) return value;
  return PUBLIC_BASE ? `${PUBLIC_BASE}/${value}` : `/${value}`;
}

export function productImage(
  value: string | null | undefined,
  slug?: string,
  categorySlug?: string,
): {
  src: string;
  isPlaceholder: boolean;
} {
  // The catalogue contains several variants of each part. Use the Figma
  // artwork for their part type when the API has no product-specific photo.
  const type =
    categorySlug ?? Object.keys(categoryAssets).find((key) => slug?.startsWith(`${key}-`));
  const artwork = (slug && productAssets[slug]) || (type && categoryAssets[type]);
  const resolved = resolveMediaUrl(value) ?? artwork;
  return resolved
    ? { src: resolved, isPlaceholder: false }
    : { src: PRODUCT_IMAGE_PLACEHOLDER, isPlaceholder: true };
}
