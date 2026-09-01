import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../src/prisma/prisma.service';
import { FavoritesService } from '../src/modules/favorites/favorites.module';

/**
 * Integration tests for `FavoritesService` (phase 6). The `Favorite` model
 * existed in the schema with zero code touching it — see
 * `claude/وضعیت-پیاده‌سازی.md`, "شناسایی فاز ۶".
 */

const PREFIX = `test-favorites-${Date.now()}`;
const slug = (name: string) => `${PREFIX}-${name}`;

const prisma = new PrismaService();
const favorites = new FavoritesService(prisma);

let categoryId = '';
let brandId = '';
let userAId = '';
let userBId = '';
let productAId = '';
let productBId = '';

beforeAll(async () => {
  const [category, brand] = await Promise.all([
    prisma.category.create({ data: { name: `${PREFIX} دسته`, slug: slug('cat') } }),
    prisma.brand.create({ data: { name: `${PREFIX} برند`, slug: slug('brand') } }),
  ]);
  categoryId = category.id;
  brandId = brand.id;

  const [userA, userB] = await Promise.all([
    prisma.user.create({ data: { phone: slug('user-a') } }),
    prisma.user.create({ data: { phone: slug('user-b') } }),
  ]);
  userAId = userA.id;
  userBId = userB.id;

  const [productA, productB] = await Promise.all([
    prisma.product.create({
      data: {
        slug: slug('p-a'),
        name: `${PREFIX} محصول الف`,
        sku: slug('sku-a'),
        categoryId,
        brandId,
        retailPrice: 100_000,
      },
    }),
    prisma.product.create({
      data: {
        slug: slug('p-b'),
        name: `${PREFIX} محصول ب`,
        sku: slug('sku-b'),
        categoryId,
        brandId,
        retailPrice: 200_000,
      },
    }),
  ]);
  productAId = productA.id;
  productBId = productB.id;
});

afterAll(async () => {
  await prisma.favorite.deleteMany({ where: { user: { phone: { startsWith: PREFIX } } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { phone: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe('FavoritesService', () => {
  it('starts empty', async () => {
    expect(await favorites.list(userAId)).toEqual([]);
  });

  it('adds a favorite and returns full product info from list()', async () => {
    await favorites.add(userAId, productAId);
    const list = await favorites.list(userAId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(productAId);
    expect(list[0].name).toBe(`${PREFIX} محصول الف`);
    expect(list[0].brand?.id).toBe(brandId);
  });

  it('is idempotent — adding the same favorite twice does not throw or duplicate', async () => {
    await favorites.add(userAId, productAId);
    await favorites.add(userAId, productAId);
    const list = await favorites.list(userAId);
    expect(list).toHaveLength(1);
  });

  it('rejects favoriting a nonexistent product', async () => {
    await expect(favorites.add(userAId, 'no-such-product')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('scopes favorites per user', async () => {
    await favorites.add(userBId, productBId);
    expect(await favorites.list(userAId)).toHaveLength(1);
    const listB = await favorites.list(userBId);
    expect(listB).toHaveLength(1);
    expect(listB[0].id).toBe(productBId);
  });

  it('removes a favorite', async () => {
    await favorites.remove(userAId, productAId);
    expect(await favorites.list(userAId)).toEqual([]);
  });

  it('is idempotent — removing an absent favorite does not throw', async () => {
    await expect(favorites.remove(userAId, productAId)).resolves.toEqual({
      success: true,
      favorited: false,
    });
  });
});
