import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { UserRole } from '@edalat/shared';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * RBAC integration tests for the phase 9a write endpoints (Product, Category,
 * Brand, Vehicle + Compatibility).
 *
 * `RolesGuard`/`@Roles()` existed since an earlier phase but sat unused on
 * every controller (`claude/وضعیت-پیاده‌سازی.md`, فاز ۹الف) — this is the
 * first test that actually exercises the guard pipeline end to end: real
 * HTTP requests through `JwtAuthGuard` + `RolesGuard`, not a unit test of the
 * guard's `canActivate()` in isolation.
 *
 * `JwtStrategy.validate()` only decodes the token payload — it never looks
 * the user up in the database (see jwt.strategy.ts) — so a validly *signed*
 * token is sufficient to authenticate as any role here without seeding a
 * matching `User` row. This mirrors production: RolesGuard's authorization
 * decision is 100% a function of the JWT's `role` claim.
 */

const PREFIX = `test-rbac-${Date.now()}`;
const slug = (name: string) => `${PREFIX}-${name}`;

const prisma = new PrismaService();
const jwt = new JwtService({ secret: process.env.JWT_ACCESS_SECRET });

function tokenFor(role: UserRole): string {
  return jwt.sign(
    { sub: `${PREFIX}-user`, phone: '09120000001', role },
    { expiresIn: '5m' },
  );
}

const adminToken = tokenFor(UserRole.ADMIN);
const contentManagerToken = tokenFor(UserRole.CONTENT_MANAGER);
const customerToken = tokenFor(UserRole.CUSTOMER);

let app: INestApplication;
let vehicleBrandId = '';
let vehicleId = '';
let productId = '';

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();

  // Mirrors src/main.ts's bootstrap() — Test.createTestingModule doesn't run
  // it, so the prefix/versioning/validation pipeline has to be set up here
  // too, or every request below would 404 or skip DTO validation.
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  const vehicleBrand = await prisma.vehicleBrand.create({
    data: { name: `${PREFIX} برند خودرو`, slug: slug('vb') },
  });
  vehicleBrandId = vehicleBrand.id;

  const vehicle = await prisma.vehicle.create({
    data: { slug: slug('vehicle'), brandId: vehicleBrandId, model: `${PREFIX} مدل` },
  });
  vehicleId = vehicle.id;

  const product = await prisma.product.create({
    data: {
      slug: slug('product'),
      name: `${PREFIX} محصول`,
      sku: slug('sku'),
      retailPrice: 100_000,
    },
  });
  productId = product.id;
});

afterAll(async () => {
  await prisma.productVehicleCompatibility.deleteMany({ where: { productId } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.vehicle.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.vehicleBrand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await app.close();
  await prisma.$disconnect();
});

describe('POST /categories — RBAC', () => {
  const body = { name: `${PREFIX} دسته جدید` };

  it('401s with no token', async () => {
    await request(app.getHttpServer()).post('/api/v1/categories').send(body).expect(401);
  });

  it('403s with a CUSTOMER token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(body)
      .expect(403);
  });

  it('201s with an ADMIN token, and the row is really there', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);

    expect(response.body.name).toBe(body.name);
    const row = await prisma.category.findUnique({ where: { id: response.body.id } });
    expect(row).not.toBeNull();
  });

  it('also allows CONTENT_MANAGER — PRD §51 grants catalog writes to that role too', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${contentManagerToken}`)
      .send({ name: `${PREFIX} دسته دوم` })
      .expect(201);
  });
});

describe('DELETE /categories/:id — RBAC restricted to ADMIN/SUPER_ADMIN', () => {
  it('403s CONTENT_MANAGER (create-only role, not delete)', async () => {
    const created = await prisma.category.create({
      data: { name: `${PREFIX} حذف‌شدنی`, slug: slug('to-delete') },
    });
    await request(app.getHttpServer())
      .delete(`/api/v1/categories/${created.id}`)
      .set('Authorization', `Bearer ${contentManagerToken}`)
      .expect(403);
  });

  it('200s ADMIN and the row is actually gone', async () => {
    const created = await prisma.category.create({
      data: { name: `${PREFIX} حذف‌شدنی۲`, slug: slug('to-delete-2') },
    });
    await request(app.getHttpServer())
      .delete(`/api/v1/categories/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const row = await prisma.category.findUnique({ where: { id: created.id } });
    expect(row).toBeNull();
  });
});

describe('POST /brands — RBAC', () => {
  it('401s with no token, 403s with CUSTOMER, 201s with ADMIN', async () => {
    const body = { name: `${PREFIX} برند جدید` };

    await request(app.getHttpServer()).post('/api/v1/brands').send(body).expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(body)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);
  });
});

describe('POST /vehicles — RBAC', () => {
  it('401s with no token, 403s with CUSTOMER, 201s with ADMIN', async () => {
    const body = { brandId: vehicleBrandId, model: `${PREFIX} مدل جدید` };

    await request(app.getHttpServer()).post('/api/v1/vehicles').send(body).expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(body)
      .expect(403);

    const response = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);

    expect(response.body.model).toBe(body.model);
  });
});

describe('POST /products — RBAC and validation', () => {
  it('401s with no token, 403s with CUSTOMER, 201s with ADMIN', async () => {
    const body = { name: `${PREFIX} محصول جدید`, sku: slug('new-sku'), retailPrice: 50_000 };

    await request(app.getHttpServer()).post('/api/v1/products').send(body).expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(body)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);
  });

  it('400s a missing required field even for an authorized ADMIN — RolesGuard is not a substitute for DTO validation', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `${PREFIX} ناقص` }) // sku, retailPrice missing
      .expect(400);
  });
});

describe('DELETE /products/:id — soft delete (deactivate, not remove)', () => {
  it('403s CUSTOMER, then 200s ADMIN and only flips isActive', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const row = await prisma.product.findUnique({ where: { id: productId } });
    expect(row).not.toBeNull();
    expect(row!.isActive).toBe(false);
  });
});

describe('POST /products/:id/compatibility — RBAC (Rule 3, a real relation)', () => {
  it('401s with no token, 403s with CUSTOMER, 201s with ADMIN', async () => {
    const body = { vehicleId };

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/compatibility`)
      .send(body)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/compatibility`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send(body)
      .expect(403);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/compatibility`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);

    expect(response.body.productId).toBe(productId);
    expect(response.body.vehicleId).toBe(vehicleId);

    // GET /vehicles/:id/compatibility is unguarded (read side) — confirms the
    // row the admin-only POST above created is really visible to the manager UI.
    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${vehicleId}/compatibility`)
      .expect(200);
    expect(listResponse.body.some((row: { id: string }) => row.id === response.body.id)).toBe(true);
  });
});
