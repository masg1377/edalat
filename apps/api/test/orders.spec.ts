import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PurchaseType } from '@edalat/shared';

import { PrismaService } from '../src/prisma/prisma.service';
import { PricingService } from '../src/modules/pricing/pricing.service';
import { CartService } from '../src/modules/cart/cart.module';
import { OrdersService } from '../src/modules/orders/orders.module';

/**
 * Integration tests for checkout + mock-payment confirmation, against a real
 * PostgreSQL (same convention as `catalog.spec.ts` / `vehicles.spec.ts`).
 * This module shipped with zero coverage before phase 5 (see
 * `claude/وضعیت-پیاده‌سازی.md`, "شناسایی فاز ۵") — it is also the only place
 * that exercises `OrdersService.confirmMockPayment`, the endpoint standing in
 * for a real payment gateway per the phase 5 decision (PRD §90.6: Mock/Manual
 * only, no real gateway wired in the MVP).
 *
 * Every fixture is namespaced with a unique prefix and removed in `afterAll`.
 * Each test that calls `checkout` clears the cart first — a rejected checkout
 * deliberately leaves the cart untouched (nothing to roll back), so without
 * clearing, leftover items from an earlier test would leak into the next
 * checkout call.
 */

const PREFIX = `test-orders-${Date.now()}`;
const slug = (name: string) => `${PREFIX}-${name}`;

const prisma = new PrismaService();
const pricing = new PricingService(prisma);
const cart = new CartService(prisma, pricing);
const orders = new OrdersService(prisma, cart, pricing);

let categoryId = '';
let brandId = '';
let userAId = '';
let userBId = '';
let addressAId = '';
let addressBId = '';

let productCounter = 0;
/** A fresh product per call keeps stock/reservation assertions order-independent. */
async function createProduct(stock: number) {
  productCounter += 1;
  return prisma.product.create({
    data: {
      slug: slug(`p-${productCounter}`),
      name: `${PREFIX} محصول ${productCounter}`,
      sku: slug(`sku-${productCounter}`),
      categoryId,
      brandId,
      retailPrice: 150_000,
      stockQuantity: stock,
    },
  });
}

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

  const [addressA, addressB] = await Promise.all([
    prisma.address.create({
      data: {
        userId: userAId,
        title: 'خانه',
        recipientName: `${PREFIX} گیرنده الف`,
        phone: '09120000001',
        province: 'تهران',
        city: 'تهران',
        line: 'خیابان آزمایشی، پلاک ۱',
        isDefault: true,
      },
    }),
    prisma.address.create({
      data: {
        userId: userBId,
        title: 'خانه',
        recipientName: `${PREFIX} گیرنده ب`,
        phone: '09120000002',
        province: 'تهران',
        city: 'تهران',
        line: 'خیابان دیگر، پلاک ۲',
        isDefault: true,
      },
    }),
  ]);
  addressAId = addressA.id;
  addressBId = addressB.id;
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { order: { user: { phone: { startsWith: PREFIX } } } } });
  await prisma.orderItem.deleteMany({ where: { order: { user: { phone: { startsWith: PREFIX } } } } });
  await prisma.order.deleteMany({ where: { user: { phone: { startsWith: PREFIX } } } });
  await prisma.cartItem.deleteMany({ where: { cart: { user: { phone: { startsWith: PREFIX } } } } });
  await prisma.cart.deleteMany({ where: { user: { phone: { startsWith: PREFIX } } } });
  await prisma.address.deleteMany({ where: { user: { phone: { startsWith: PREFIX } } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.brand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.category.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { phone: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

/* ------------------------------------------------------------------ */

describe('OrdersService.checkout', () => {
  it('creates an AWAITING_PAYMENT order, reserves (not decrements) stock, and empties the cart', async () => {
    await cart.clear(userAId);
    const product = await createProduct(50);
    await cart.addItem(userAId, { productId: product.id, purchaseType: PurchaseType.RETAIL, quantity: 2 });

    const order = await orders.checkout(userAId, { addressId: addressAId });

    expect(order.status).toBe(OrderStatus.AWAITING_PAYMENT);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].productId).toBe(product.id);
    expect(order.items[0].quantity).toBe(2);
    expect(order.grandTotal).toBe(300_000);
    expect(order.address?.id).toBe(addressAId);
    expect(order.payments).toHaveLength(0);

    const row = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(row.reservedQuantity).toBe(2);
    expect(row.stockQuantity).toBe(50); // checkout reserves; it does not decrement yet

    const remainingCart = await cart.read(userAId);
    expect(remainingCart.items).toHaveLength(0);
  });

  it('rejects checkout with an address belonging to another user', async () => {
    await cart.clear(userAId);
    const product = await createProduct(10);
    await cart.addItem(userAId, { productId: product.id, purchaseType: PurchaseType.RETAIL, quantity: 1 });

    await expect(orders.checkout(userAId, { addressId: addressBId })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects checkout with a nonexistent address', async () => {
    await cart.clear(userAId);
    const product = await createProduct(10);
    await cart.addItem(userAId, { productId: product.id, purchaseType: PurchaseType.RETAIL, quantity: 1 });

    await expect(orders.checkout(userAId, { addressId: 'no-such-address' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects checkout when stock is insufficient, and leaves the cart untouched', async () => {
    await cart.clear(userAId);
    const product = await createProduct(1);
    await cart.addItem(userAId, { productId: product.id, purchaseType: PurchaseType.RETAIL, quantity: 5 });

    await expect(orders.checkout(userAId, { addressId: addressAId })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const row = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(row.reservedQuantity).toBe(0);

    const remainingCart = await cart.read(userAId);
    expect(remainingCart.items).toHaveLength(1);
  });

  it('rejects checkout with an empty cart', async () => {
    await cart.clear(userAId);
    await expect(orders.checkout(userAId, { addressId: addressAId })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('OrdersService.confirmMockPayment', () => {
  it('marks the order PAID, records a MOCK payment, and finalizes inventory', async () => {
    await cart.clear(userAId);
    const product = await createProduct(20);
    await cart.addItem(userAId, { productId: product.id, purchaseType: PurchaseType.RETAIL, quantity: 3 });
    const order = await orders.checkout(userAId, { addressId: addressAId });

    const confirmed = await orders.confirmMockPayment(userAId, order.id);

    expect(confirmed.status).toBe(OrderStatus.PAID);
    expect(confirmed.paidAt).not.toBeNull();
    expect(confirmed.payments).toHaveLength(1);
    expect(confirmed.payments[0].gateway).toBe('MOCK');
    expect(confirmed.payments[0].status).toBe('SUCCEEDED');
    expect(confirmed.payments[0].amount).toBe(order.grandTotal);

    const row = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    // Checkout reserved 3 (stock 20, reserved 3); confirmation must now finalize
    // both counters — this is the step that actually removes stock, not checkout.
    expect(row.stockQuantity).toBe(17);
    expect(row.reservedQuantity).toBe(0);
  });

  it('rejects confirmation for an order owned by another user', async () => {
    await cart.clear(userAId);
    const product = await createProduct(10);
    await cart.addItem(userAId, { productId: product.id, purchaseType: PurchaseType.RETAIL, quantity: 1 });
    const order = await orders.checkout(userAId, { addressId: addressAId });

    await expect(orders.confirmMockPayment(userBId, order.id)).rejects.toBeInstanceOf(NotFoundException);

    // Untouched by the rejected attempt.
    const row = await orders.findOne(userAId, order.id);
    expect(row.status).toBe(OrderStatus.AWAITING_PAYMENT);
  });

  it('rejects confirming an order that is already PAID', async () => {
    await cart.clear(userAId);
    const product = await createProduct(10);
    await cart.addItem(userAId, { productId: product.id, purchaseType: PurchaseType.RETAIL, quantity: 1 });
    const order = await orders.checkout(userAId, { addressId: addressAId });

    await orders.confirmMockPayment(userAId, order.id);

    await expect(orders.confirmMockPayment(userAId, order.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects confirmation for a nonexistent order', async () => {
    await expect(orders.confirmMockPayment(userAId, 'no-such-order')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
