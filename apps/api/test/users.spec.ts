import { ConflictException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/modules/users/users.module';

/**
 * Integration tests for `UsersService` (phase 6). Before this phase, the
 * closest thing was an ad-hoc `GET/PATCH /auth/me` pair with zero coverage
 * and no service layer — see `claude/وضعیت-پیاده‌سازی.md`, "شناسایی فاز ۶".
 */

const PREFIX = `test-users-${Date.now()}`;
const slug = (name: string) => `${PREFIX}-${name}`;

const prisma = new PrismaService();
const users = new UsersService(prisma);

let userAId = '';
let userBId = '';

beforeAll(async () => {
  const [userA, userB] = await Promise.all([
    prisma.user.create({ data: { phone: slug('user-a'), firstName: 'الف' } }),
    prisma.user.create({ data: { phone: slug('user-b'), email: `${PREFIX}-taken@example.com` } }),
  ]);
  userAId = userA.id;
  userBId = userB.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { phone: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe('UsersService.me', () => {
  it('returns the full profile shape, including fields the old /auth/me dropped', async () => {
    const profile = await users.me(userAId);
    expect(profile.id).toBe(userAId);
    expect(profile.firstName).toBe('الف');
    expect(profile.phoneVerified).toBe(false);
    expect(profile.emailVerified).toBe(false);
    expect(profile.nationalId).toBeNull();
    expect(profile.role).toBe('CUSTOMER');
  });

  it('rejects a nonexistent user', async () => {
    await expect(users.me('no-such-user')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UsersService.updateMe', () => {
  it('updates the editable fields', async () => {
    const updated = await users.updateMe(userAId, {
      firstName: 'محمد',
      lastName: 'رضایی',
      companyName: 'شرکت تست',
      nationalId: '1234567890',
    });
    expect(updated.firstName).toBe('محمد');
    expect(updated.lastName).toBe('رضایی');
    expect(updated.companyName).toBe('شرکت تست');
    expect(updated.nationalId).toBe('1234567890');
  });

  it('resets emailVerified when the email changes', async () => {
    await prisma.user.update({ where: { id: userAId }, data: { emailVerified: true } });
    const updated = await users.updateMe(userAId, { email: `${PREFIX}-a@example.com` });
    expect(updated.email).toBe(`${PREFIX}-a@example.com`);
    expect(updated.emailVerified).toBe(false);
  });

  it('rejects an email already used by another account', async () => {
    await expect(
      users.updateMe(userAId, { email: `${PREFIX}-taken@example.com` }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('leaves fields not present in the DTO untouched', async () => {
    const before = await users.me(userBId);
    const updated = await users.updateMe(userBId, { companyName: 'شرکت ب' });
    expect(updated.companyName).toBe('شرکت ب');
    expect(updated.email).toBe(before.email);
  });
});
