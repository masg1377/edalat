// React Imports
import { Suspense } from 'react'

// Next Imports
import type { Metadata } from 'next'

// Component Imports
import ProductAddView from '@views/apps/ecommerce/products/add/ProductAddView'

export const metadata: Metadata = {
  title: 'افزودن / ویرایش محصول'
}

// ProductAddView reads the ?id= edit target via useSearchParams(), which
// Next.js requires a Suspense boundary for during static generation.
const ProductAddPage = () => {
  return (
    <Suspense>
      <ProductAddView />
    </Suspense>
  )
}

export default ProductAddPage
