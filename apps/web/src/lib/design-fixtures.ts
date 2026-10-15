import type {
  CategorySummary,
  ProductSummary,
  VehicleSummary,
  ProductDetail,
} from '@edalat/shared';
import { categoryAssets, productAssets, vehicleBrandAssets } from '@/lib/design-assets';

export const categories: CategorySummary[] = [
  ['air-filter', 'فیلتر هوا'],
  ['cabin-filter', 'فیلترکابین'],
  ['oil-filter', 'فیلتر روغن'],
  ['oil-strainer', 'صافی روغن'],
].map(([slug, name]) => ({ id: slug, slug, name, parentId: null, imageUrl: categoryAssets[slug] }));
export const vehicleBrands = [
  ['bmw', 'ب ام و', 'bmw'],
  ['toyota', 'تویوتا', 'Toyota'],
  ['kia', 'کیا', 'Kia'],
  ['ikco', 'ایران خودرو', 'Iran Khodro'],
  ['saipa', 'سایپا', 'Saipa'],
  ['audi', 'آئودی', 'Audi'],
  ['hyundai', 'هیوندای', 'Hyundai'],
  ['benz', 'بنز', 'Benz'],
].map(([slug, name, nameEn]) => ({
  id: slug,
  slug,
  name,
  nameEn,
  logoUrl: vehicleBrandAssets[slug],
}));
export const bestSelling: ProductSummary[] = [
  ['oil-filter-samand-ef7', 'فیلتر روغن سمند EF7'],
  ['cabin-filter-universal-tu5', 'فیلتر کابین خودرو'],
  ['air-filter-peugeot-206', 'فیلتر هوای موتور پژو 206'],
].map(([slug, name]) => ({
  id: slug,
  slug,
  name,
  brand: { id: 'isaco', slug: 'isaco', name: 'ایساکو', logoUrl: null, country: 'ایران' },
  category: null,
  mainImageUrl: productAssets[slug],
  technicalCode: null,
  retailPrice: 650000,
  lowestWholesalePrice: null,
  minWholesaleQuantity: null,
  compatibleVehicleCount: 0,
  ratingAverage: 4.8,
  ratingCount: 48,
  inStock: true,
}));
export const vehicle: VehicleSummary = {
  id: 'samand-ef7',
  slug: 'samand-ef7',
  brand: {
    id: 'ikco',
    slug: 'ikco',
    name: 'ایران‌خودرو',
    logoUrl: vehicleBrandAssets.ikco,
    country: 'ایران',
  },
  model: 'سمند',
  generation: 'سورن',
  yearFrom: 1387,
  yearTo: null,
  engine: 'EF7',
  engineCode: 'EF7',
};

export const detail: ProductDetail = {
  ...bestSelling[0],
  description:
    'فیلتر روغن با کیفیت برای محافظت از موتور و حذف ذرات ریز و ناخالصی‌های روغن. مناسب موتورهای EF7.',
  sku: 'LF16352',
  technicalCode: 'LF16352',
  oemCodes: ['PS-206'],
  images: [],
  specifications: { 'نوع فیلتر': 'فیلتر روغن', 'جنس بدنه': 'فلزی', 'کشور سازنده': 'ایران' },
  wholesaleTiers: [],
  replacement: { km: 5000, kmMax: 7000, months: 6, notes: null },
  availableQuantity: 50,
  compatibleVehicles: [vehicle],
  relatedProducts: bestSelling.slice(1),
  similarProducts: [],
};
