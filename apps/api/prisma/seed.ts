import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Development seed. Real catalogue data is managed from the admin panel
 * (PRD Rule 7) — this file only makes local development possible.
 */

const vehicleBrands = [
  { name: 'ایران خودرو', nameEn: 'Iran Khodro', slug: 'ikco', country: 'ایران', sortOrder: 1 },
  { name: 'سایپا', nameEn: 'Saipa', slug: 'saipa', country: 'ایران', sortOrder: 2 },
  { name: 'تویوتا', nameEn: 'Toyota', slug: 'toyota', country: 'ژاپن', sortOrder: 3 },
  { name: 'کیا', nameEn: 'Kia', slug: 'kia', country: 'کره جنوبی', sortOrder: 4 },
  { name: 'هیوندای', nameEn: 'Hyundai', slug: 'hyundai', country: 'کره جنوبی', sortOrder: 5 },
  { name: 'بنز', nameEn: 'Benz', slug: 'benz', country: 'آلمان', sortOrder: 6 },
  { name: 'ب ام و', nameEn: 'BMW', slug: 'bmw', country: 'آلمان', sortOrder: 7 },
  { name: 'آئودی', nameEn: 'Audi', slug: 'audi', country: 'آلمان', sortOrder: 8 },
];

const vehicles = [
  { brand: 'ikco', slug: 'peugeot-206-tu5', model: 'پژو ۲۰۶', generation: 'تیپ ۵', engine: 'TU5', engineCode: 'TU5JP4', displacement: 1587, yearFrom: 1385, yearTo: 1401 },
  { brand: 'ikco', slug: 'peugeot-207-tu5', model: 'پژو ۲۰۷', generation: 'اتوماتیک', engine: 'TU5', engineCode: 'TU5JP4', displacement: 1587, yearFrom: 1394, yearTo: null },
  { brand: 'ikco', slug: 'peugeot-pars-tu5', model: 'پژو پارس', generation: 'ELX', engine: 'TU5', engineCode: 'TU5JP4', displacement: 1587, yearFrom: 1388, yearTo: null },
  { brand: 'ikco', slug: 'samand-ef7', model: 'سمند', generation: 'سورن', engine: 'EF7', engineCode: 'EF7', displacement: 1650, yearFrom: 1387, yearTo: null },
  { brand: 'ikco', slug: 'dena-plus-ef7', model: 'دنا پلاس', generation: 'توربو', engine: 'EF7 TC', engineCode: 'EF7-TC', displacement: 1650, yearFrom: 1396, yearTo: null },
  { brand: 'ikco', slug: 'tara-ef7', model: 'تارا', generation: 'اتوماتیک', engine: 'EF7 TC', engineCode: 'EF7-TC', displacement: 1650, yearFrom: 1399, yearTo: null },
  { brand: 'saipa', slug: 'quick-m15', model: 'کوییک', generation: 'R', engine: 'M15', engineCode: 'M15', displacement: 1500, yearFrom: 1397, yearTo: null },
  { brand: 'saipa', slug: 'shahin-m15', model: 'شاهین', generation: 'G', engine: 'M15', engineCode: 'M15', displacement: 1500, yearFrom: 1399, yearTo: null },
  { brand: 'saipa', slug: 'tiba-2-m15', model: 'تیبا ۲', generation: '—', engine: 'M15', engineCode: 'M15', displacement: 1500, yearFrom: 1394, yearTo: 1402 },
];

const categories = [
  { name: 'فیلتر روغن', slug: 'oil-filter', sortOrder: 1 },
  { name: 'فیلتر هوا', slug: 'air-filter', sortOrder: 2 },
  { name: 'فیلتر کابین', slug: 'cabin-filter', sortOrder: 3 },
  { name: 'فیلتر سوخت', slug: 'fuel-filter', sortOrder: 4 },
  { name: 'صافی روغن', slug: 'oil-strainer', sortOrder: 5 },
];

const partBrands = [
  { name: 'عدالت فیلتر', slug: 'edalat-filter', country: 'ایران', sortOrder: 1 },
  { name: 'ایساکو', slug: 'isaco', country: 'ایران', sortOrder: 2 },
  { name: 'سرکان فیلتر', slug: 'sarkan', country: 'ایران', sortOrder: 3 },
];

interface SeedProduct {
  slug: string;
  name: string;
  sku: string;
  technicalCode: string;
  oemCodes: string[];
  category: string;
  brand: string;
  retailPrice: number;
  tiers: Array<[number, number | null, number]>;
  minWholesaleQty: number;
  replacementKm: number;
  replacementKmMax: number;
  vehicles: string[];
  isFeatured?: boolean;
}

const products: SeedProduct[] = [
  {
    slug: 'oil-filter-samand-ef7',
    name: 'فیلتر روغن سمند EF7',
    sku: 'EF-OF-EF7',
    technicalCode: 'LF16352',
    oemCodes: ['0K30E14302', '1109AY'],
    category: 'oil-filter',
    brand: 'edalat-filter',
    retailPrice: 380_000,
    tiers: [
      [20, 49, 275_000],
      [50, 99, 260_000],
      [100, null, 245_000],
    ],
    minWholesaleQty: 20,
    replacementKm: 7_000,
    replacementKmMax: 10_000,
    vehicles: ['samand-ef7', 'dena-plus-ef7', 'tara-ef7'],
    isFeatured: true,
  },
  {
    slug: 'air-filter-peugeot-206',
    name: 'فیلتر هوای موتور پژو ۲۰۶',
    sku: 'EF-AF-206',
    technicalCode: 'AF20601',
    oemCodes: ['1444TT', '9467632080'],
    category: 'air-filter',
    brand: 'edalat-filter',
    retailPrice: 650_000,
    tiers: [
      [12, 49, 480_000],
      [50, null, 445_000],
    ],
    minWholesaleQty: 12,
    replacementKm: 15_000,
    replacementKmMax: 20_000,
    vehicles: ['peugeot-206-tu5', 'peugeot-207-tu5', 'peugeot-pars-tu5'],
    isFeatured: true,
  },
  {
    slug: 'cabin-filter-universal-tu5',
    name: 'فیلتر کابین خودرو',
    sku: 'EF-CF-TU5',
    technicalCode: 'CF10245',
    oemCodes: ['6479A1'],
    category: 'cabin-filter',
    brand: 'isaco',
    retailPrice: 450_000,
    tiers: [
      [20, 99, 330_000],
      [100, null, 300_000],
    ],
    minWholesaleQty: 20,
    replacementKm: 10_000,
    replacementKmMax: 15_000,
    vehicles: ['peugeot-206-tu5', 'peugeot-207-tu5', 'samand-ef7', 'dena-plus-ef7'],
    isFeatured: true,
  },
  {
    slug: 'fuel-filter-quick-m15',
    name: 'فیلتر سوخت کوییک M15',
    sku: 'EF-FF-M15',
    technicalCode: 'FF77120',
    oemCodes: ['3191117000'],
    category: 'fuel-filter',
    brand: 'sarkan',
    retailPrice: 520_000,
    tiers: [[24, null, 395_000]],
    minWholesaleQty: 24,
    replacementKm: 20_000,
    replacementKmMax: 30_000,
    vehicles: ['quick-m15', 'shahin-m15', 'tiba-2-m15'],
  },
  {
    slug: 'oil-strainer-tu5',
    name: 'صافی روغن پژو TU5',
    sku: 'EF-OS-TU5',
    technicalCode: 'OS55410',
    oemCodes: ['1103N5'],
    category: 'oil-strainer',
    brand: 'edalat-filter',
    retailPrice: 720_000,
    tiers: [
      [10, 49, 560_000],
      [50, null, 520_000],
    ],
    minWholesaleQty: 10,
    replacementKm: 60_000,
    replacementKmMax: 80_000,
    vehicles: ['peugeot-206-tu5', 'peugeot-pars-tu5'],
  },
  {
    slug: 'air-filter-samand-ef7',
    name: 'فیلتر هوای موتور سمند EF7',
    sku: 'EF-AF-EF7',
    technicalCode: 'AF16610',
    oemCodes: ['1444TP'],
    category: 'air-filter',
    brand: 'edalat-filter',
    retailPrice: 590_000,
    tiers: [
      [12, 49, 430_000],
      [50, null, 400_000],
    ],
    minWholesaleQty: 12,
    replacementKm: 15_000,
    replacementKmMax: 20_000,
    vehicles: ['samand-ef7', 'dena-plus-ef7', 'tara-ef7'],
  },
  {
    slug: 'cabin-filter-dena-plus',
    name: 'فیلتر کابین دنا پلاس',
    sku: 'EF-CF-DENA',
    technicalCode: 'CF10388',
    oemCodes: ['6447XR'],
    category: 'cabin-filter',
    brand: 'edalat-filter',
    retailPrice: 480_000,
    tiers: [[20, null, 350_000]],
    minWholesaleQty: 20,
    replacementKm: 10_000,
    replacementKmMax: 15_000,
    vehicles: ['dena-plus-ef7', 'tara-ef7'],
  },
  {
    slug: 'oil-filter-peugeot-206-tu5',
    name: 'فیلتر روغن پژو ۲۰۶ تیپ ۵',
    sku: 'EF-OF-206',
    technicalCode: 'LF16100',
    oemCodes: ['1109AY', '1109R6'],
    category: 'oil-filter',
    brand: 'edalat-filter',
    retailPrice: 340_000,
    tiers: [
      [20, 99, 250_000],
      [100, null, 230_000],
    ],
    minWholesaleQty: 20,
    replacementKm: 7_000,
    replacementKmMax: 10_000,
    vehicles: ['peugeot-206-tu5', 'peugeot-207-tu5', 'peugeot-pars-tu5'],
    isFeatured: true,
  },
  {
    slug: 'oil-filter-quick-m15',
    name: 'فیلتر روغن کوییک M15',
    sku: 'EF-OF-M15',
    technicalCode: 'LF26300',
    oemCodes: ['2630002503'],
    category: 'oil-filter',
    brand: 'sarkan',
    retailPrice: 295_000,
    tiers: [[24, null, 215_000]],
    minWholesaleQty: 24,
    replacementKm: 8_000,
    replacementKmMax: 10_000,
    vehicles: ['quick-m15', 'shahin-m15', 'tiba-2-m15'],
  },
  {
    slug: 'air-filter-shahin-m15',
    name: 'فیلتر هوای شاهین',
    sku: 'EF-AF-SHAHIN',
    technicalCode: 'AF28113',
    oemCodes: ['281132H000'],
    category: 'air-filter',
    brand: 'isaco',
    retailPrice: 620_000,
    tiers: [[12, null, 470_000]],
    minWholesaleQty: 12,
    replacementKm: 15_000,
    replacementKmMax: 20_000,
    vehicles: ['shahin-m15', 'quick-m15'],
  },
  {
    slug: 'cabin-filter-tara',
    name: 'فیلتر کابین تارا',
    sku: 'EF-CF-TARA',
    technicalCode: 'CF10420',
    oemCodes: ['6479C4'],
    category: 'cabin-filter',
    brand: 'edalat-filter',
    retailPrice: 510_000,
    tiers: [[20, null, 375_000]],
    minWholesaleQty: 20,
    replacementKm: 10_000,
    replacementKmMax: 15_000,
    vehicles: ['tara-ef7'],
  },
  {
    slug: 'fuel-filter-peugeot-pars',
    name: 'فیلتر سوخت پژو پارس',
    sku: 'EF-FF-PARS',
    technicalCode: 'FF19045',
    oemCodes: ['190495'],
    category: 'fuel-filter',
    brand: 'edalat-filter',
    retailPrice: 470_000,
    tiers: [[24, null, 350_000]],
    minWholesaleQty: 24,
    replacementKm: 20_000,
    replacementKmMax: 30_000,
    vehicles: ['peugeot-pars-tu5', 'peugeot-206-tu5'],
  },
  {
    slug: 'oil-strainer-ef7',
    name: 'صافی روغن سمند EF7',
    sku: 'EF-OS-EF7',
    technicalCode: 'OS55620',
    oemCodes: ['1103S1'],
    category: 'oil-strainer',
    brand: 'sarkan',
    retailPrice: 690_000,
    tiers: [[10, null, 540_000]],
    minWholesaleQty: 10,
    replacementKm: 60_000,
    replacementKmMax: 80_000,
    vehicles: ['samand-ef7', 'dena-plus-ef7'],
  },
];

/**
 * PRD §30 — staff sign-in uses phone + password (`POST /auth/login`), not
 * the customer OTP flow. This is the only account that can reach
 * `apps/admin` locally; production must never ship this password.
 * See claude/وضعیت-پیاده‌سازی.md, فاز ۹الف for the credentials.
 */
const DEV_ADMIN = {
  phone: '09120000000',
  password: 'Admin@12345',
};

async function main() {
  console.log('Seeding…');

  const adminPasswordHash = await argon2.hash(DEV_ADMIN.password);
  await prisma.user.upsert({
    where: { phone: DEV_ADMIN.phone },
    update: { passwordHash: adminPasswordHash, role: 'ADMIN', isActive: true },
    create: {
      phone: DEV_ADMIN.phone,
      phoneVerified: true,
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      firstName: 'ادمین',
      lastName: 'توسعه',
    },
  });
  console.log(`Dev admin ready — phone: ${DEV_ADMIN.phone}, password: ${DEV_ADMIN.password}`);

  const brandIds = new Map<string, string>();
  for (const b of partBrands) {
    const row = await prisma.brand.upsert({ where: { slug: b.slug }, update: b, create: b });
    brandIds.set(b.slug, row.id);
  }

  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: c, create: c });
    categoryIds.set(c.slug, row.id);
  }

  const vehicleBrandIds = new Map<string, string>();
  for (const vb of vehicleBrands) {
    const row = await prisma.vehicleBrand.upsert({ where: { slug: vb.slug }, update: vb, create: vb });
    vehicleBrandIds.set(vb.slug, row.id);
  }

  const vehicleIds = new Map<string, string>();
  for (const v of vehicles) {
    const data = {
      slug: v.slug,
      brandId: vehicleBrandIds.get(v.brand)!,
      model: v.model,
      generation: v.generation,
      engine: v.engine,
      engineCode: v.engineCode,
      displacement: v.displacement,
      yearFrom: v.yearFrom,
      yearTo: v.yearTo,
      fuelType: 'PETROL' as const,
    };
    const row = await prisma.vehicle.upsert({ where: { slug: v.slug }, update: data, create: data });
    vehicleIds.set(v.slug, row.id);

    await prisma.vehicleServiceInfo.upsert({
      where: { vehicleId: row.id },
      update: {},
      create: {
        vehicleId: row.id,
        engineOilGrade: '10W-40',
        engineOilCapacityLiters: 4.0,
        oilChangeKm: 7_000,
        oilFilterChangeKm: 7_000,
        airFilterChangeKm: 15_000,
        cabinFilterChangeKm: 10_000,
        fuelFilterChangeKm: 20_000,
        notes: 'در شرایط ترافیک سنگین یا آب‌وهوای گرد‌و‌غباری، بازه‌ها را کوتاه‌تر در نظر بگیرید.',
      },
    });
  }

  for (const p of products) {
    const data = {
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      technicalCode: p.technicalCode,
      oemCodes: p.oemCodes,
      aliases: [p.name.replace(/\s+/g, ' ')],
      keywords: p.name.split(' '),
      brandId: brandIds.get(p.brand)!,
      categoryId: categoryIds.get(p.category)!,
      retailPrice: p.retailPrice,
      minWholesaleQty: p.minWholesaleQty,
      stockQuantity: 500,
      replacementKm: p.replacementKm,
      replacementKmMax: p.replacementKmMax,
      isFeatured: p.isFeatured ?? false,
      salesCount: Math.floor(Math.random() * 400),
      ratingAverage: 4.8,
      ratingCount: 12,
      specifications: { 'کشور سازنده': 'ایران', 'نوع بسته‌بندی': 'جعبه‌ای' },
      description: `${p.name} با استاندارد کیفی روز، مناسب برای مصرف خرده و عمده.`,
    };

    const row = await prisma.product.upsert({ where: { slug: p.slug }, update: data, create: data });

    await prisma.wholesalePriceRule.deleteMany({ where: { productId: row.id } });
    await prisma.wholesalePriceRule.createMany({
      data: p.tiers.map(([min, max, price]) => ({
        productId: row.id,
        minQuantity: min,
        maxQuantity: max,
        unitPrice: price,
      })),
    });

    for (const vSlug of p.vehicles) {
      await prisma.productVehicleCompatibility.upsert({
        where: { productId_vehicleId: { productId: row.id, vehicleId: vehicleIds.get(vSlug)! } },
        update: {},
        create: {
          productId: row.id,
          vehicleId: vehicleIds.get(vSlug)!,
          isExactFit: true,
          replacementKm: p.replacementKm,
        },
      });
    }
  }

  console.log(
    `Done: ${partBrands.length} brands, ${categories.length} categories, ${vehicles.length} vehicles, ${products.length} products.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
