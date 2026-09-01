import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../src/prisma/prisma.service';
import { VehiclesService } from '../src/modules/vehicles/vehicles.module';

/**
 * Integration tests for the vehicles module — against a real PostgreSQL,
 * same convention as `catalog.spec.ts`. The module shipped without any test
 * coverage (phase 4 audit, `claude/وضعیت-پیاده‌سازی.md`); this brings it up
 * to the standard the other modules already meet.
 *
 * Every fixture is namespaced with a unique prefix and removed in `afterAll`,
 * so runs are isolated from seed data and from each other.
 */

const PREFIX = `test-vehicles-${Date.now()}`;
const slug = (name: string) => `${PREFIX}-${name}`;

const prisma = new PrismaService();
const vehicles = new VehiclesService(prisma);

let categoryId = '';
let airCategoryId = '';
let brandId = '';
let vehicleBrandId = '';
let otherVehicleBrandId = '';

/** پژو ۲۰۶ has two engine variants — exercises `variants()` grouping by model. */
let peugeot206TU5Id = '';
let peugeot206EF7Id = '';
/** A second model of the same brand — exercises `models()` distinctness. */
let peugeotParsId = '';
/** Inactive — must never surface in brands/models/variants/products. */
let inactiveVehicleId = '';

let exactFitProductId = '';
let partialFitProductId = '';
let inactiveProductId = '';

beforeAll(async () => {
  const [category, air] = await Promise.all([
    prisma.category.create({ data: { name: `${PREFIX} فیلتر روغن`, slug: slug('oil-cat') } }),
    prisma.category.create({ data: { name: `${PREFIX} فیلتر هوا`, slug: slug('air-cat') } }),
  ]);
  categoryId = category.id;
  airCategoryId = air.id;

  const brand = await prisma.brand.create({ data: { name: `${PREFIX} عدالت`, slug: slug('brand') } });
  brandId = brand.id;

  const [vehicleBrand, otherVehicleBrand] = await Promise.all([
    prisma.vehicleBrand.create({
      data: { name: `${PREFIX} پژو`, slug: slug('peugeot'), sortOrder: 1 },
    }),
    prisma.vehicleBrand.create({
      data: { name: `${PREFIX} سمند`, slug: slug('samand-brand'), sortOrder: 2, isActive: false },
    }),
  ]);
  vehicleBrandId = vehicleBrand.id;
  otherVehicleBrandId = otherVehicleBrand.id;

  const [tu5, ef7, pars, inactiveVehicle] = await Promise.all([
    prisma.vehicle.create({
      data: {
        slug: slug('peugeot-206-tu5'),
        brandId: vehicleBrandId,
        model: `${PREFIX} پژو ۲۰۶`,
        generation: 'نسل یک',
        engine: 'TU5',
        yearFrom: 1385,
        yearTo: 1394,
      },
    }),
    prisma.vehicle.create({
      data: {
        slug: slug('peugeot-206-ef7'),
        brandId: vehicleBrandId,
        model: `${PREFIX} پژو ۲۰۶`,
        generation: 'نسل دو',
        engine: 'EF7',
        yearFrom: 1395,
        yearTo: null,
      },
    }),
    prisma.vehicle.create({
      data: {
        slug: slug('peugeot-pars'),
        brandId: vehicleBrandId,
        model: `${PREFIX} پژو پارس`,
        engine: 'XU7',
        yearFrom: 1390,
      },
    }),
    prisma.vehicle.create({
      data: {
        slug: slug('inactive-vehicle'),
        brandId: vehicleBrandId,
        model: `${PREFIX} غیرفعال`,
        isActive: false,
      },
    }),
  ]);
  peugeot206TU5Id = tu5.id;
  peugeot206EF7Id = ef7.id;
  peugeotParsId = pars.id;
  inactiveVehicleId = inactiveVehicle.id;

  await prisma.vehicleServiceInfo.create({
    data: {
      vehicleId: peugeot206TU5Id,
      engineOilGrade: '5W-30',
      engineOilCapacityLiters: 3.5,
      oilChangeKm: 7000,
      oilFilterChangeKm: 7000,
      airFilterChangeKm: 15000,
      cabinFilterChangeKm: 15000,
    },
  });

  const [exactProduct, partialProduct, inactiveProduct] = await Promise.all([
    prisma.product.create({
      data: {
        slug: slug('oil-filter'),
        name: `${PREFIX} فیلتر روغن دقیق`,
        sku: slug('sku-oil'),
        categoryId,
        brandId,
        retailPrice: 150_000,
        stockQuantity: 10,
      },
    }),
    prisma.product.create({
      data: {
        slug: slug('air-filter'),
        name: `${PREFIX} فیلتر هوا با آداپتور`,
        sku: slug('sku-air'),
        categoryId: airCategoryId,
        brandId,
        retailPrice: 220_000,
        stockQuantity: 4,
      },
    }),
    prisma.product.create({
      data: {
        slug: slug('inactive-product'),
        name: `${PREFIX} محصول غیرفعال`,
        sku: slug('sku-off'),
        categoryId,
        brandId,
        retailPrice: 90_000,
        stockQuantity: 1,
        isActive: false,
      },
    }),
  ]);
  exactFitProductId = exactProduct.id;
  partialFitProductId = partialProduct.id;
  inactiveProductId = inactiveProduct.id;

  await prisma.productVehicleCompatibility.createMany({
    data: [
      { productId: exactFitProductId, vehicleId: peugeot206TU5Id, isExactFit: true },
      { productId: partialFitProductId, vehicleId: peugeot206TU5Id, isExactFit: false, notes: 'با آداپتور' },
      { productId: inactiveProductId, vehicleId: peugeot206TU5Id, isExactFit: true },
    ],
  });
});

afterAll(async () => {
  await prisma.productVehicleCompatibility.deleteMany({
    where: { product: { slug: { startsWith: PREFIX } } },
  });
  await prisma.vehicleServiceInfo.deleteMany({ where: { vehicle: { slug: { startsWith: PREFIX } } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.vehicle.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.vehicleBrand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

/* ------------------------------------------------------------------ */

describe('VehiclesService.brands', () => {
  it('returns only active vehicle brands, with a vehicle count', async () => {
    const result = await vehicles.brands();
    const ours = result.filter((b) => b.slug.startsWith(PREFIX));

    expect(ours.map((b) => b.slug)).toEqual([slug('peugeot')]);
    /*
     * 4 vehicles were created for this brand, 1 of them inactive. Regression
     * guard: Prisma's `_count` on a relation counts every row unless scoped
     * with a `where`, so this used to silently include the inactive fixture
     * too (4, not 3) — fixed in `VehiclesService.brands()` by adding
     * `_count.select.vehicles.where: { isActive: true }`.
     */
    expect(ours[0].vehicleCount).toBe(3);
  });

  it('excludes an inactive vehicle brand entirely', async () => {
    const result = await vehicles.brands();
    expect(result.some((b) => b.id === otherVehicleBrandId)).toBe(false);
  });
});

describe('VehiclesService.models', () => {
  it('returns distinct, active model names for a brand', async () => {
    const result = await vehicles.models(slug('peugeot'));
    expect(result.sort()).toEqual([`${PREFIX} پژو ۲۰۶`, `${PREFIX} پژو پارس`].sort());
  });

  it('excludes inactive vehicles from the model list', async () => {
    const result = await vehicles.models(slug('peugeot'));
    expect(result).not.toContain(`${PREFIX} غیرفعال`);
  });

  it('returns an empty list for an unknown brand slug', async () => {
    expect(await vehicles.models('no-such-brand-slug')).toEqual([]);
  });
});

describe('VehiclesService.variants', () => {
  it('returns every engine/generation variant of one model', async () => {
    const result = await vehicles.variants(slug('peugeot'), `${PREFIX} پژو ۲۰۶`);
    expect(result.map((v) => v.id).sort()).toEqual([peugeot206EF7Id, peugeot206TU5Id].sort());
    expect(result.map((v) => v.engine).sort()).toEqual(['EF7', 'TU5']);
  });

  it('carries the parent brand on each variant', async () => {
    const [variant] = await vehicles.variants(slug('peugeot'), `${PREFIX} پژو ۲۰۶`);
    expect(variant.brand.slug).toBe(slug('peugeot'));
  });
});

describe('VehiclesService.findBySlugOrId', () => {
  it('resolves by slug', async () => {
    const result = await vehicles.findBySlugOrId(slug('peugeot-206-tu5'));
    expect(result.id).toBe(peugeot206TU5Id);
    expect(result.engine).toBe('TU5');
  });

  it('resolves by id — the shape catalog `vehicleId` filters carry', async () => {
    const result = await vehicles.findBySlugOrId(peugeot206TU5Id);
    expect(result.slug).toBe(slug('peugeot-206-tu5'));
  });

  it('includes mapped service information (PRD §21/§24)', async () => {
    const result = await vehicles.findBySlugOrId(peugeot206TU5Id);
    expect(result.service).not.toBeNull();
    expect(result.service?.engineOilGrade).toBe('5W-30');
    expect(result.service?.engineOilCapacityLiters).toBe(3.5);
    expect(result.service?.oilFilterChangeKm).toBe(7000);
  });

  it('returns null service info when none was recorded', async () => {
    const result = await vehicles.findBySlugOrId(peugeotParsId);
    expect(result.service).toBeNull();
  });

  it('throws NotFoundException for an inactive vehicle', async () => {
    await expect(vehicles.findBySlugOrId(inactiveVehicleId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException for an unknown slug or id', async () => {
    await expect(vehicles.findBySlugOrId('no-such-vehicle')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('VehiclesService.products', () => {
  it('returns only active products compatible with the vehicle', async () => {
    const result = await vehicles.products(peugeot206TU5Id);
    const ids = result.items.map((p) => p.id);
    expect(ids).toContain(exactFitProductId);
    expect(ids).toContain(partialFitProductId);
    expect(ids).not.toContain(inactiveProductId);
  });

  it('orders exact fits before partial fits', async () => {
    const result = await vehicles.products(peugeot206TU5Id);
    const exactIndex = result.items.findIndex((p) => p.id === exactFitProductId);
    const partialIndex = result.items.findIndex((p) => p.id === partialFitProductId);
    expect(exactIndex).toBeLessThan(partialIndex);
  });

  it('returns no products for a vehicle with no compatibility rows', async () => {
    const result = await vehicles.products(peugeotParsId);
    expect(result.items).toHaveLength(0);
    expect(result.byCategory).toHaveLength(0);
  });

  it('groups products by category — the API `?grouped=true` shape (PRD §24)', async () => {
    const result = await vehicles.products(peugeot206TU5Id);
    const oilGroup = result.byCategory.find((g) => g.categoryId === categoryId);
    const airGroup = result.byCategory.find((g) => g.categoryId === airCategoryId);

    expect(oilGroup?.items.map((p) => p.id)).toEqual([exactFitProductId]);
    expect(airGroup?.items.map((p) => p.id)).toEqual([partialFitProductId]);
  });
});
