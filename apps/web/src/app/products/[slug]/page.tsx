import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ProductDetailView } from '@/components/product/product-detail-view';
import { ApiError, api, safe } from '@/lib/api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await safe(api.products.bySlug(slug), null);
  if (!product) return { title: 'محصول یافت نشد' };

  const title = product.name;
  const description =
    product.description ??
    `${product.name}${product.technicalCode ? ` با کد فنی ${product.technicalCode}` : ''} — قیمت خرده و عمده، خودروهای سازگار و بازه تعویض.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/products/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/products/${product.slug}`,
      images: product.mainImageUrl ? [product.mainImageUrl] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await api.products.bySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  // PRD §36 — APPROVED reviews for the "نظرات کاربران" tab, fetched
  // server-side so the tab has content on first paint (see ProductReviews).
  const reviews = await safe(api.products.reviews(product.id, { limit: 20 }), {
    items: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false },
    averageRating: 0,
  });

  return <ProductDetailView product={product} reviews={reviews} />;
}
