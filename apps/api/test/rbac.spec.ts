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
const manufacturingOperatorToken = tokenFor(UserRole.MANUFACTURING_OPERATOR);
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

// فاز ۹ج fixtures — one ManufacturingRequest and one ProductIdentificationRequest
// so the admin list/detail/patch endpoints under test have real rows to return.
let testManufacturingRequestId = '';
let testIdentificationRequestId = '';

// فاز ۹د fixtures — reviews need real FK-backed rows (Review.userId is a
// required FK, unlike the fake-`sub` trick most RBAC checks below get away
// with) plus a real PAID order to exercise the isVerifiedPurchase check.
let testCustomerToken = '';
let reviewProductId = '';
let verifiedPurchaseProductId = '';
let verifiedPurchaseOrderId = '';
let reviewId = '';
let verifiedReviewId = '';

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

  const testManufacturingRequest = await prisma.manufacturingRequest.create({
    data: {
      referenceNumber: slug('mfg').toUpperCase(),
      contactName: `${PREFIX} مشتری تولید`,
      phone: '09120000002',
      brandName: `${PREFIX} برند`,
      productType: 'فیلتر روغن',
      quantity: 100,
      status: 'SUBMITTED',
      events: { create: { toStatus: 'SUBMITTED', note: 'درخواست ثبت شد.' } },
    },
  });
  testManufacturingRequestId = testManufacturingRequest.id;

  const testIdentificationRequest = await prisma.productIdentificationRequest.create({
    data: {
      referenceNumber: slug('img').toUpperCase(),
      images: ['https://example.com/fixture.jpg'],
      status: 'SUBMITTED',
      events: { create: { toStatus: 'SUBMITTED', note: 'تصویر دریافت شد.' } },
    },
  });
  testIdentificationRequestId = testIdentificationRequest.id;

  // فاز ۹د — dedicated products (the shared `productId` fixture above gets
  // soft-deleted by the "DELETE /products/:id" test earlier in this file,
  // and reviews shouldn't depend on that ordering) plus a real PAID order so
  // ReviewsService.create() has something to find for isVerifiedPurchase.
  const reviewProduct = await prisma.product.create({
    data: {
      slug: slug('review-product'),
      name: `${PREFIX} محصول نظردار`,
      sku: slug('review-sku'),
      retailPrice: 80_000,
    },
  });
  reviewProductId = reviewProduct.id;

  const verifiedPurchaseProduct = await prisma.product.create({
    data: {
      slug: slug('verified-product'),
      name: `${PREFIX} محصول خریداری‌شده`,
      sku: slug('verified-sku'),
      retailPrice: 120_000,
    },
  });
  verifiedPurchaseProductId = verifiedPurchaseProduct.id;

  const verifiedPurchaseOrder = await prisma.order.create({
    data: {
      orderNumber: slug('verified-order').toUpperCase(),
      userId: testCustomerId,
      status: 'PAID',
      subtotal: 120_000,
      grandTotal: 120_000,
      items: {
        create: {
          productId: verifiedPurchaseProductId,
          productName: verifiedPurchaseProduct.name,
          productSku: verifiedPurchaseProduct.sku,
          purchaseType: 'RETAIL',
          quantity: 1,
          unitPrice: 120_000,
          lineTotal: 120_000,
        },
      },
    },
  });
  verifiedPurchaseOrderId = verifiedPurchaseOrder.id;

  testCustomerToken = jwt.sign(
    { sub: testCustomerId, phone: testCustomer.phone, role: UserRole.CUSTOMER },
    { expiresIn: '5m' },
  );
});

afterAll(async () => {
  await prisma.requestEvent.deleteMany({
    where: {
      OR: [
        { manufacturingRequestId: testManufacturingRequestId },
        { identificationRequestId: testIdentificationRequestId },
      ],
    },
  });
  await prisma.manufacturingRequest.deleteMany({ where: { id: testManufacturingRequestId } });
  await prisma.productIdentificationRequest.deleteMany({ where: { id: testIdentificationRequestId } });
  await prisma.order.deleteMany({ where: { id: testOrderId } });
  await prisma.order.deleteMany({ where: { id: verifiedPurchaseOrderId } });
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

/* ------------------------------------------------------------------ */
/* فاز ۹ج — GET /manufacturing/requests/admin,                         */
/* GET/PATCH /manufacturing/requests/admin/:id                         */
/* (PRD §55, @Roles(ADMIN, MANUFACTURING_OPERATOR, SUPER_ADMIN))       */
/* ------------------------------------------------------------------ */

describe('GET /manufacturing/requests/admin — RBAC', () => {
  it('401s with no token', async () => {
    await request(app.getHttpServer()).get('/api/v1/manufacturing/requests/admin').expect(401);
  });

  it('403s with a CUSTOMER token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/manufacturing/requests/admin')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('403s SALES_OPERATOR — this queue is MANUFACTURING_OPERATOR/ADMIN territory, not sales', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/manufacturing/requests/admin')
      .set('Authorization', `Bearer ${salesOperatorToken}`)
      .expect(403);
  });

  it('200s MANUFACTURING_OPERATOR and returns every request, including our fixture', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/manufacturing/requests/admin')
      .set('Authorization', `Bearer ${manufacturingOperatorToken}`)
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.items.some((row: { id: string }) => row.id === testManufacturingRequestId)).toBe(true);
  });

  it('200s ADMIN/SUPER_ADMIN too', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/manufacturing/requests/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/manufacturing/requests/admin')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
  });

  it('filters by search (referenceNumber/contactName/companyName)', async () => {
    const row = await prisma.manufacturingRequest.findUniqueOrThrow({ where: { id: testManufacturingRequestId } });
    const response = await request(app.getHttpServer())
      .get(`/api/v1/manufacturing/requests/admin?search=${row.referenceNumber}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.items.some((r: { id: string }) => r.id === testManufacturingRequestId)).toBe(true);
  });
});

describe('GET /manufacturing/requests/admin/:id — RBAC and shape (full event trail, unlike the customer route)', () => {
  it('401s with no token, 403s with CUSTOMER, 200s with MANUFACTURING_OPERATOR', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/manufacturing/requests/admin/${testManufacturingRequestId}`)
      .expect(401);

    await request(app.getHttpServer())
      .get(`/api/v1/manufacturing/requests/admin/${testManufacturingRequestId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/manufacturing/requests/admin/${testManufacturingRequestId}`)
      .set('Authorization', `Bearer ${manufacturingOperatorToken}`)
      .expect(200);

    expect(response.body.id).toBe(testManufacturingRequestId);
    expect(Array.isArray(response.body.events)).toBe(true);
  });
});

describe('PATCH /manufacturing/requests/admin/:id — RBAC, persistence and RequestEvent trail', () => {
  it('401s with no token, 403s with CUSTOMER, 403s with SALES_OPERATOR', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/manufacturing/requests/admin/${testManufacturingRequestId}`)
      .send({ status: 'REVIEWING' })
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/api/v1/manufacturing/requests/admin/${testManufacturingRequestId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'REVIEWING' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/manufacturing/requests/admin/${testManufacturingRequestId}`)
      .set('Authorization', `Bearer ${salesOperatorToken}`)
      .send({ status: 'REVIEWING' })
      .expect(403);
  });

  it('200s MANUFACTURING_OPERATOR, persists status/adminNotes/quotedUnitPrice, and appends a RequestEvent', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/manufacturing/requests/admin/${testManufacturingRequestId}`)
      .set('Authorization', `Bearer ${manufacturingOperatorToken}`)
      .send({ status: 'REVIEWING', adminNotes: 'یادداشت داخلی تستی', quotedUnitPrice: 250000 })
      .expect(200);

    expect(response.body.status).toBe('REVIEWING');
    expect(response.body.adminNotes).toBe('یادداشت داخلی تستی');
    expect(response.body.quotedUnitPrice).toBe(250000);
    expect(response.body.quotedAt).toBeTruthy();
    expect(
      response.body.events.some(
        (e: { fromStatus: string | null; toStatus: string }) =>
          e.fromStatus === 'SUBMITTED' && e.toStatus === 'REVIEWING',
      ),
    ).toBe(true);

    const row = await prisma.manufacturingRequest.findUniqueOrThrow({ where: { id: testManufacturingRequestId } });
    expect(row.status).toBe('REVIEWING');
    expect(Number(row.quotedUnitPrice)).toBe(250000);
  });

  it('400s an invalid status value even for an authorized operator', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/manufacturing/requests/admin/${testManufacturingRequestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'NOT_A_REAL_STATUS' })
      .expect(400);
  });

  it('400s a non-positive quotedUnitPrice', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/manufacturing/requests/admin/${testManufacturingRequestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quotedUnitPrice: -10 })
      .expect(400);
  });
});

/* ------------------------------------------------------------------ */
/* فاز ۹ج — GET /product-requests/admin,                                */
/* GET/PATCH /product-requests/admin/:id                                */
/* (PRD §56, @Roles(ADMIN, SALES_OPERATOR, SUPER_ADMIN))                */
/* ------------------------------------------------------------------ */

describe('GET /product-requests/admin — RBAC', () => {
  it('401s with no token', async () => {
    await request(app.getHttpServer()).get('/api/v1/product-requests/admin').expect(401);
  });

  it('403s with a CUSTOMER token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/product-requests/admin')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('403s MANUFACTURING_OPERATOR — this queue is SALES_OPERATOR/ADMIN territory, not manufacturing', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/product-requests/admin')
      .set('Authorization', `Bearer ${manufacturingOperatorToken}`)
      .expect(403);
  });

  it('200s SALES_OPERATOR and returns every request, including our fixture', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/product-requests/admin')
      .set('Authorization', `Bearer ${salesOperatorToken}`)
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.items.some((row: { id: string }) => row.id === testIdentificationRequestId)).toBe(true);
  });

  it('200s ADMIN/SUPER_ADMIN too', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/product-requests/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/product-requests/admin')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
  });
});

describe('GET /product-requests/admin/:id — RBAC and shape (full event trail)', () => {
  it('401s with no token, 403s with CUSTOMER, 200s with SALES_OPERATOR', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/product-requests/admin/${testIdentificationRequestId}`)
      .expect(401);

    await request(app.getHttpServer())
      .get(`/api/v1/product-requests/admin/${testIdentificationRequestId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/product-requests/admin/${testIdentificationRequestId}`)
      .set('Authorization', `Bearer ${salesOperatorToken}`)
      .expect(200);

    expect(response.body.id).toBe(testIdentificationRequestId);
    expect(Array.isArray(response.body.events)).toBe(true);
  });
});

describe('PATCH /product-requests/admin/:id — RBAC, persistence, identifiedProductId validation and RequestEvent trail', () => {
  it('401s with no token, 403s with CUSTOMER, 403s with MANUFACTURING_OPERATOR', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/product-requests/admin/${testIdentificationRequestId}`)
      .send({ status: 'UNDER_REVIEW' })
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/api/v1/product-requests/admin/${testIdentificationRequestId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'UNDER_REVIEW' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/product-requests/admin/${testIdentificationRequestId}`)
      .set('Authorization', `Bearer ${manufacturingOperatorToken}`)
      .send({ status: 'UNDER_REVIEW' })
      .expect(403);
  });

  it('200s SALES_OPERATOR, persists status/adminResponse, connects a real product, and appends a RequestEvent', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/product-requests/admin/${testIdentificationRequestId}`)
      .set('Authorization', `Bearer ${salesOperatorToken}`)
      .send({ status: 'IDENTIFIED', adminResponse: 'محصول شناسایی شد.', identifiedProductId: productId })
      .expect(200);

    expect(response.body.status).toBe('IDENTIFIED');
    expect(response.body.adminResponse).toBe('محصول شناسایی شد.');
    expect(response.body.identifiedProduct?.id).toBe(productId);
    expect(
      response.body.events.some(
        (e: { fromStatus: string | null; toStatus: string }) =>
          e.fromStatus === 'SUBMITTED' && e.toStatus === 'IDENTIFIED',
      ),
    ).toBe(true);

    const row = await prisma.productIdentificationRequest.findUniqueOrThrow({
      where: { id: testIdentificationRequestId },
    });
    expect(row.status).toBe('IDENTIFIED');
    expect(row.identifiedProductId).toBe(productId);
  });

  it('400s a non-existent identifiedProductId even for an authorized ADMIN', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/product-requests/admin/${testIdentificationRequestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ identifiedProductId: 'not-a-real-product-id' })
      .expect(400);
  });

  it('400s an invalid status value even for an authorized ADMIN', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/product-requests/admin/${testIdentificationRequestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'NOT_A_REAL_STATUS' })
      .expect(400);
  });
});

/* ------------------------------------------------------------------ */
/* فاز ۹د — POST /reviews, GET /products/:id/reviews, GET /reviews/mine, */
/* GET/PATCH /reviews/admin/:id (PRD §36/§50/§56 — @Roles(ADMIN,        */
/* CONTENT_MANAGER, SUPER_ADMIN) on the admin routes)                   */
/* ------------------------------------------------------------------ */

describe('POST /reviews — auth, validation and duplicate handling', () => {
  it('401s with no token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .send({ productId: reviewProductId, rating: 5 })
      .expect(401);
  });

  it('400s a rating outside 1..5', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${testCustomerToken}`)
      .send({ productId: reviewProductId, rating: 6 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${testCustomerToken}`)
      .send({ productId: reviewProductId, rating: 0 })
      .expect(400);
  });

  it('201s a real CUSTOMER and computes isVerifiedPurchase:true from a PAID order on that product', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${testCustomerToken}`)
      .send({
        productId: verifiedPurchaseProductId,
        rating: 5,
        title: 'خیلی خوب',
        comment: 'دقیقاً همون بود که نیاز داشتم.',
      })
      .expect(201);

    expect(response.body.status).toBe('PENDING');
    expect(response.body.isVerifiedPurchase).toBe(true);
    verifiedReviewId = response.body.id;
  });

  it('isVerifiedPurchase is false without a PAID/DELIVERED order for that product', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${testCustomerToken}`)
      .send({ productId: reviewProductId, rating: 4 })
      .expect(201);

    expect(response.body.isVerifiedPurchase).toBe(false);
    reviewId = response.body.id;
  });

  it('409s a duplicate review for the same (user, product) with a clear message, not a raw Prisma error', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${testCustomerToken}`)
      .send({ productId: reviewProductId, rating: 3 })
      .expect(409);

    expect(typeof response.body.message).toBe('string');
    expect(response.body.message).not.toMatch(/prisma/i);
  });
});

describe('GET /reviews/mine — auth and shape', () => {
  it('401s with no token', async () => {
    await request(app.getHttpServer()).get('/api/v1/reviews/mine').expect(401);
  });

  it("200s and lists the reviewer's own review regardless of status (still PENDING here)", async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/reviews/mine')
      .set('Authorization', `Bearer ${testCustomerToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(
      response.body.some(
        (row: { id: string; status: string }) => row.id === reviewId && row.status === 'PENDING',
      ),
    ).toBe(true);
  });
});

describe('GET /products/:id/reviews — public, APPROVED-only, and the rating cache it feeds', () => {
  it('200s with no token and excludes the still-PENDING review', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/products/${reviewProductId}/reviews`)
      .expect(200);

    expect(response.body.items.some((row: { id: string }) => row.id === reviewId)).toBe(false);
    expect(response.body.averageRating).toBe(0);
  });

  it('includes the review once an ADMIN approves it, and Product.ratingAverage/ratingCount resync', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/admin/${reviewId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/products/${reviewProductId}/reviews`)
      .expect(200);

    expect(response.body.items.some((row: { id: string }) => row.id === reviewId)).toBe(true);
    expect(response.body.averageRating).toBe(4);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: reviewProductId } });
    expect(product.ratingCount).toBe(1);
    expect(product.ratingAverage).toBe(4);
  });
});

describe('GET /reviews/admin — RBAC', () => {
  it('401s with no token, 403s with CUSTOMER, 403s with SALES_OPERATOR (not a review-managing role)', async () => {
    await request(app.getHttpServer()).get('/api/v1/reviews/admin').expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/reviews/admin')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/reviews/admin')
      .set('Authorization', `Bearer ${salesOperatorToken}`)
      .expect(403);
  });

  it('200s ADMIN, includes pagination + stats, and also allows CONTENT_MANAGER (PRD §51/§56)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/reviews/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.items.some((row: { id: string }) => row.id === reviewId)).toBe(true);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.stats.byStatus).toBeDefined();

    await request(app.getHttpServer())
      .get('/api/v1/reviews/admin')
      .set('Authorization', `Bearer ${contentManagerToken}`)
      .expect(200);
  });

  it('filters by status', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/reviews/admin?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      response.body.items.every((row: { status: string }) => row.status === 'PENDING'),
    ).toBe(true);
    expect(response.body.items.some((row: { id: string }) => row.id === verifiedReviewId)).toBe(true);
  });
});

describe('PATCH /reviews/admin/:id — RBAC, persistence and product rating resync', () => {
  it('401s with no token, 403s with CUSTOMER, 403s with MANUFACTURING_OPERATOR', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/admin/${verifiedReviewId}`)
      .send({ status: 'REJECTED' })
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/admin/${verifiedReviewId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'REJECTED' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/admin/${verifiedReviewId}`)
      .set('Authorization', `Bearer ${manufacturingOperatorToken}`)
      .send({ status: 'REJECTED' })
      .expect(403);
  });

  it('200s CONTENT_MANAGER and persists status + adminNote', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/reviews/admin/${verifiedReviewId}`)
      .set('Authorization', `Bearer ${contentManagerToken}`)
      .send({ status: 'REJECTED', adminNote: 'محتوای نامرتبط با محصول' })
      .expect(200);

    expect(response.body.status).toBe('REJECTED');
    expect(response.body.adminNote).toBe('محتوای نامرتبط با محصول');

    const row = await prisma.review.findUniqueOrThrow({ where: { id: verifiedReviewId } });
    expect(row.status).toBe('REJECTED');
  });

  it('hiding a previously-approved review removes it from the public list and the product rating resets to 0', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/admin/${reviewId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'HIDDEN' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/products/${reviewProductId}/reviews`)
      .expect(200);
    expect(response.body.items.length).toBe(0);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: reviewProductId } });
    expect(product.ratingCount).toBe(0);
    expect(product.ratingAverage).toBe(0);
  });

  it('404s a non-existent review id even for an authorized ADMIN', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/reviews/admin/not-a-real-review-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' })
      .expect(404);
  });
});

/**
 * فاز ۹ه — GET /admin/stats/overview. RBAC محدود به ADMIN/SUPER_ADMIN است
 * (نه SALES_OPERATOR/CONTENT_MANAGER/MANUFACTURING_OPERATOR — برخلاف
 * endpointهای صف‌های عملیاتی که چند نقش تخصصی را هم راه می‌دهند، این
 * endpoint دادهٔ مالی/سراسری برمی‌گرداند). دادهٔ عددی دقیق را assert
 * نمی‌کنیم چون فیکسچرهای توصیف‌های دیگر هم روی همین دیتابیس تست
 * محصول/سفارش می‌سازند؛ فقط شکل پاسخ و این‌که فیکسچرهای این فایل در جمع
 * دیده می‌شوند را بررسی می‌کنیم.
 */
describe('GET /admin/stats/overview — RBAC', () => {
  it('401s with no token', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/stats/overview').expect(401);
  });

  it('403s with a CUSTOMER token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats/overview')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('403s SALES_OPERATOR — unlike orders/manufacturing/product-requests admin routes, stats is ADMIN/SUPER_ADMIN only', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats/overview')
      .set('Authorization', `Bearer ${salesOperatorToken}`)
      .expect(403);
  });

  it('403s CONTENT_MANAGER and MANUFACTURING_OPERATOR too', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats/overview')
      .set('Authorization', `Bearer ${contentManagerToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats/overview')
      .set('Authorization', `Bearer ${manufacturingOperatorToken}`)
      .expect(403);
  });

  it('200s ADMIN with the full overview shape, default 30-day period', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/stats/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.period.days).toBe(30);
    expect(response.body.sales.dailyBreakdown).toHaveLength(30);
    expect(typeof response.body.sales.total).toBe('number');
    expect(typeof response.body.sales.orderCount).toBe('number');

    // هر مقدار OrderStatus باید کلید داشته باشد، حتی اگر صفر باشد.
    for (const status of [
      'PENDING',
      'AWAITING_PAYMENT',
      'PAID',
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
    ]) {
      expect(typeof response.body.ordersByStatus[status]).toBe('number');
    }

    expect(response.body.usersCount.total).toBeGreaterThanOrEqual(1);
    // فیکسچر بالای فایل یک ManufacturingRequest و یک ProductIdentificationRequest
    // با status: SUBMITTED می‌سازد.
    expect(response.body.manufacturingByStatus.SUBMITTED).toBeGreaterThanOrEqual(1);
    expect(response.body.productRequestsByStatus.SUBMITTED).toBeGreaterThanOrEqual(1);

    expect(response.body.lowStock.threshold).toBe(5);
    expect(Array.isArray(response.body.lowStock.items)).toBe(true);

    // فیکسچر بالای فایل یک Order با grandTotal=100000 (PENDING) می‌سازد —
    // در recentOrders (۱۰ سفارش آخر بر اساس createdAt) باید دیده شود.
    expect(
      response.body.recentOrders.some((row: { id: string }) => row.id === testOrderId),
    ).toBe(true);

    // فاز ۱۰ — Search Analytics هنوز پیاده نشده.
    expect(response.body.popularSearches).toEqual([]);
  });

  it('also allows SUPER_ADMIN', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats/overview')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
  });

  it('respects a custom `days` query param', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/stats/overview?days=7')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.period.days).toBe(7);
    expect(response.body.sales.dailyBreakdown).toHaveLength(7);
  });

  it('counts only PAID+ orders toward sales.total — our PENDING fixture order is excluded, the PAID one is included', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/stats/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // verifiedPurchaseOrder (فیکسچر بالای فایل) grandTotal=120000, status PAID,
    // در بازهٔ ۳۰ روز پیش‌فرض ساخته شده — باید در مجموع فروش لحاظ شود.
    expect(response.body.sales.total).toBeGreaterThanOrEqual(120_000);
  });
});
