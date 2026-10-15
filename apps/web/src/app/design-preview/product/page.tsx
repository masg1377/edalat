import { notFound } from 'next/navigation';
import { ProductDetailView } from '@/components/product/product-detail-view';
import { detail } from '@/lib/design-fixtures';
export const metadata = { title: 'پیش‌نمایش محصول', robots: { index: false, follow: false } };
export default function ProductPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <ProductDetailView
      product={detail}
      reviews={{
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
        averageRating: 0,
      }}
    />
  );
}
