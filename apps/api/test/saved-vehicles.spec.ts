import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../src/prisma/prisma.service';
import { SavedVehiclesService } from '../src/modules/saved-vehicles/saved-vehicles.module';

/**
 * Integration tests for `SavedVehiclesService` (PRD §26 phase). Mirrors
 * `favorites.spec.ts` exactly — the `SavedVehicle` model existed in the
 * schema/migration with zero code touching it, same situation `Favorite`
 * was in before phase 6.
 */

const PREFIX = `test-saved-vehicles-${Date.now()}`;
const slug = (name: string) => `${PREFIX}-${name}`;

const prisma = new PrismaService();
const savedVehicles = new SavedVehiclesService(prisma);

let vehicleBrandId = '';
let userAId = '';
let userBId = '';
let vehicleAId = '';
let vehicleBId = '';

beforeAll(async () => {
  const vehicleBrand = await prisma.vehicleBrand.create({
    data: { name: `${PREFIX} برند`, slug: slug('vbrand') },
  });
  vehicleBrandId = vehicleBrand.id;

  const [userA, userB] = await Promise.all([
    prisma.user.create({ data: { phone: slug('user-a') } }),
    prisma.user.create({ data: { phone: slug('user-b') } }),
  ]);
  userAId = userA.id;
  userBId = userB.id;

  const [vehicleA, vehicleB] = await Promise.all([
    prisma.vehicle.create({
      data: { slug: slug('v-a'), brandId: vehicleBrandId, model: `${PREFIX} مدل الف` },
    }),
    prisma.vehicle.create({
      data: { slug: slug('v-b'), brandId: vehicleBrandId, model: `${PREFIX} مدل ب` },
    }),
  ]);
  vehicleAId = vehicleA.id;
  vehicleBId = vehicleB.id;
});

afterAll(async () => {
  await prisma.savedVehicle.deleteMany({ where: { user: { phone: { startsWith: PREFIX } } } });
  await prisma.vehicle.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.vehicleBrand.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { phone: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe('SavedVehiclesService', () => {
  it('starts empty', async () => {
    expect(await savedVehicles.list(userAId)).toEqual([]);
  });

  it('adds a saved vehicle and returns full vehicle info from list()', async () => {
    await savedVehicles.add(userAId, vehicleAId);
    const list = await savedVehicles.list(userAId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(vehicleAId);
    expect(list[0].model).toBe(`${PREFIX} مدل الف`);
    expect(list[0].brand?.id).toBe(vehicleBrandId);
  });

  it('is idempotent — adding the same vehicle twice does not throw or duplicate', async () => {
    await savedVehicles.add(userAId, vehicleAId);
    await savedVehicles.add(userAId, vehicleAId);
    const list = await savedVehicles.list(userAId);
    expect(list).toHaveLength(1);
  });

  it('rejects saving a nonexistent vehicle', async () => {
    await expect(savedVehicles.add(userAId, 'no-such-vehicle')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('scopes saved vehicles per user', async () => {
    await savedVehicles.add(userBId, vehicleBId);
    expect(await savedVehicles.list(userAId)).toHaveLength(1);
    const listB = await savedVehicles.list(userBId);
    expect(listB).toHaveLength(1);
    expect(listB[0].id).toBe(vehicleBId);
  });

  it('removes a saved vehicle', async () => {
    await savedVehicles.remove(userAId, vehicleAId);
    expect(await savedVehicles.list(userAId)).toEqual([]);
  });

  it('is idempotent — removing an absent saved vehicle does not throw', async () => {
    await expect(savedVehicles.remove(userAId, vehicleAId)).resolves.toEqual({
      success: true,
      saved: false,
    });
  });

  /**
   * Bug fix (reported by user): the vehicle detail page's save button
   * showed "not saved" again every time it was revisited, even for a
   * vehicle that genuinely was saved — it only ever reflected the current
   * browser session's own clicks. `isSaved()` is what the button now calls
   * on mount to get the real per-user state. At this point in the suite
   * (see the tests above, run in order): userA has nothing saved, userB
   * still has vehicleB saved from the "scopes saved vehicles per user" test.
   */
  it('isSaved() reports whether the vehicle is currently saved for that user', async () => {
    expect(await savedVehicles.isSaved(userAId, vehicleAId)).toEqual({ saved: false });
    expect(await savedVehicles.isSaved(userBId, vehicleBId)).toEqual({ saved: true });

    await savedVehicles.add(userAId, vehicleAId);
    expect(await savedVehicles.isSaved(userAId, vehicleAId)).toEqual({ saved: true });

    await savedVehicles.remove(userAId, vehicleAId);
    expect(await savedVehicles.isSaved(userAId, vehicleAId)).toEqual({ saved: false });
  });
});
