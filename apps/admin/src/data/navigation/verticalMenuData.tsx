// Type Imports
import type { VerticalMenuDataType } from '@/types/menuTypes'

const verticalMenuData = (): VerticalMenuDataType[] => [
  {
    label: 'محصولات',
    href: '/apps/ecommerce/products/list',
    icon: 'tabler-box'
  },
  {
    label: 'دسته‌بندی‌ها',
    href: '/apps/ecommerce/products/category',
    icon: 'tabler-sitemap'
  },
  {
    label: 'برندها',
    href: '/apps/ecommerce/products/brands',
    icon: 'tabler-tag'
  },
  {
    label: 'خودروها',
    href: '/apps/ecommerce/products/vehicles',
    icon: 'tabler-car'
  }
]

export default verticalMenuData
