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
 * Brand, Vehicle + Compatibility) and the phase 9ب admin endpoints (Orders,
 * Users).
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
const superAdminToken = tokenFor(UserRole.SUPER_ADMIN);
const salesOperatorToken = tokenFor(UserRole.SALES_OPERATOR);
const contentManagerToken = tokenFor(UserRole.CONTENT_MANAGER);
const customerToken = tokenFor(UserRole.CUSTOMER);

let app: INestApplication;
let vehicleBrandId = '';
let vehicleId = '';
let productId = '';

// PRD §57/§51 — phase 9ب fixtures: a real User row (Order.userId is a
// required FK, not scoped by the signed-token trick above) and an Order
// placed by it, so the admin list/detail/patch endpoints have something to
// return besides an empty page.
let testCustomerId = '';
let testOrderId = '';

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

  const testCustomer = await prisma.user.create({
    data: { phone: `0912${Date.now().toString().slice(-7)}`, role: UserRole.CUSTOMER },
  });
  testCustomerId = testCustomer.id;

  const testOrder = await prisma.order.create({
    data: {
      orderNumber: slug('order').toUpperCase(),
      userId: testCustomerId,
      subtotal: 100_000,
      grandTotal: 100_000,
    },
  });
  testOrderId = testOrder.id;
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: testOrderId } });
  await prisma.user.deleteMany({ where: { id: testCustomerId } });
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

/* ------------------------------------------------------------------ */
/* Phase 9ب — GET /orders/admin, GET/PATCH /orders/admin/:id           */
/* (PRD §57, @Roles(ADMIN, SALES_OPERATOR, SUPER_ADMIN))               */
/* ------------------------------------------------------------------ */

describe('GET /orders/admin — RBAC', () => {
  it('401s with no token', async () => {
    await request(app.getHttpServer()).get('/api/v1/orders/admin').expect(401);
  });

  it('403s with a CUSTOMER token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/orders/admin')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('403s CONTENT_MANAGER — orders are not a catalog role (unlike products/categories)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/orders/admin')
      .set('Authorization', `Bearer ${contentManagerToken}`)
      .expect(403);
  });

  it('200s ADMIN and returns every order, not scoped to the caller — includes our fixture order', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/orders/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.items.some((row: { id: string }) => row.id === testOrderId)).toBe(true);
  });

  it('also allows SALES_OPERATOR — PRD §57 grants order management to that role too', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/orders/admin')
      .set('Authorization', `Bearer ${salesOperatorToken}`)
      .expect(200);

    expect(response.body.items.some((row: { id: string }) => row.id === testOrderId)).toBe(true);
  });

  it('filters by orderNumber', async () => {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: testOrderId } });
    const response = await request(app.getHttpServer())
      .get(`/api/v1/orders/admin?orderNumber=${order.orderNumber}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items.every((row: { orderNumber: string }) => row.orderNumber === order.orderNumber)).toBe(
      true,
    );
  });
});

describe('GET /orders/admin/:id — RBAC and shape (not scoped to the caller, unlike GET /orders/:id)', () => {
  it('401s with no token, 403s with CUSTOMER, 200s with ADMIN and includes customer info', async () => {
    await request(app.getHttpServer()).get(`/api/v1/orders/admin/${testOrderId}`).expect(401);

    await request(app.getHttpServer())
      .get(`/api/v1/orders/admin/${testOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/orders/admin/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(testOrderId);
    expect(response.body.userId).toBe(testCustomerId);
    expect(response.body.customerPhone).toBeDefined();
  });
});

describe('PATCH /orders/admin/:id — RBAC and persistence (PRD §35 status, trackingCode, adminNote)', () => {
  it('401s with no token, 403s with CUSTOMER', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/admin/${testOrderId}`)
      .send({ status: 'PROCESSING' })
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/admin/${testOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'PROCESSING' })
      .expect(403);
  });

  it('200s SUPER_ADMIN and the change is really persisted', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/orders/admin/${testOrderId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ status: 'PROCESSING', trackingCode: 'TRACK-123', adminNote: 'یادداشت تستی' })
      .expect(200);

    expect(response.body.status).toBe('PROCESSING');
    expect(response.body.trackingCode).toBe('TRACK-123');
    expect(response.body.adminNote).toBe('یادداشت تستی');

    const row = await prisma.order.findUniqueOrThrow({ where: { id: testOrderId } });
    expect(row.status).toBe('PROCESSING');
    expect(row.trackingCode).toBe('TRACK-123');
    expect(row.adminNote).toBe('یادداشت تستی');
  });

  it('400s an invalid status value even for an authorized ADMIN', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/admin/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'NOT_A_REAL_STATUS' })
      .expect(400);
  });
});

/* ------------------------------------------------------------------ */
/* Phase 9ب — GET /users/admin, GET/PATCH /users/admin/:id             */
/* (PRD §51, @Roles(ADMIN, SUPER_ADMIN))                               */
/* ------------------------------------------------------------------ */

describe('GET /users/admin — RBAC', () => {
  it('401s with no token', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/admin').expect(401);
  });

  it('403s with a CUSTOMER token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/admin')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('403s SALES_OPERATOR — user management is narrower than order management (ADMIN/SUPER_ADMIN only)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/admin')
      .set('Authorization', `Bearer ${salesOperatorToken}`)
      .expect(403);
  });

  it('200s ADMIN and includes our fixture customer', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.items.some((row: { id: string }) => row.id === testCustomerId)).toBe(true);
  });

  it('filters by phone', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: testCustomerId } });
    const response = await request(app.getHttpServer())
      .get(`/api/v1/users/admin?phone=${user.phone}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.items.some((row: { id: string }) => row.id === testCustomerId)).toBe(true);
  });
});

describe('GET /users/admin/:id — RBAC', () => {
  it('401s with no token, 403s with CUSTOMER, 200s with ADMIN', async () => {
    await request(app.getHttpServer()).get(`/api/v1/users/admin/${testCustomerId}`).expect(401);

    await request(app.getHttpServer())
      .get(`/api/v1/users/admin/${testCustomerId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/users/admin/${testCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(testCustomerId);
  });
});

describe('PATCH /users/admin/:id — RBAC and persistence (PRD §51 role/isActive)', () => {
  it('401s with no token, 403s with CUSTOMER, 403s with SALES_OPERATOR', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/users/admin/${testCustomerId}`)
      .send({ role: 'WHOLESALE_CUSTOMER' })
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/admin/${testCustomerId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ role: 'WHOLESALE_CUSTOMER' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/admin/${testCustomerId}`)
      .set('Authorization', `Bearer ${salesOperatorToken}`)
      .send({ role: 'WHOLESALE_CUSTOMER' })
      .expect(403);
  });

  it('200s ADMIN, changes role and isActive, and the change is really persisted', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/users/admin/${testCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'WHOLESALE_CUSTOMER', isActive: false })
      .expect(200);

    expect(response.body.role).toBe('WHOLESALE_CUSTOMER');
    expect(response.body.isActive).toBe(false);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: testCustomerId } });
    expect(row.role).toBe('WHOLESALE_CUSTOMER');
    expect(row.isActive).toBe(false);
  });
});
