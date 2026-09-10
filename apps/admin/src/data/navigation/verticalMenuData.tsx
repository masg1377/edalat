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
  },
  {
    label: 'سفارش‌ها',
    href: '/apps/ecommerce/orders/list',
    icon: 'tabler-shopping-cart'
  },
  {
    label: 'کاربران',
    href: '/apps/user/list',
    icon: 'tabler-users'
  }
]

export default verticalMenuData
