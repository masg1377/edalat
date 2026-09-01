import {
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser, JwtAuthGuard, type RequestUser } from '../../common/auth.decorators';
import { mapProductSummary, productSummarySelect } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * PRD §37/§31 — favorites. The `Favorite` model existed in the schema with
 * zero code touching it — the Dashboard → Favorites tab and the header's
 * `/dashboard/favorites` link (already wired, pre-phase-6) had nothing to
 * show. This module, plus a favorite toggle on the product card/detail page,
 * is what fills them.
 */
@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Full product info, not just ids — PRD §31 asks for the favorites list
   * to read like a catalog page, not an id list. */
  async list(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: productSummarySelect } },
    });
    return rows.map((row) => mapProductSummary(row.product));
  }

  /**
   * Idempotent: a double click (or a stale UI retry) must not surface a
   * unique-constraint error — `upsert` on the `[userId, productId]` unique
   * index just no-ops when the favorite already exists.
   */
  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('محصول یافت نشد.');

    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { success: true, favorited: true };
  }

  /** Also idempotent — removing an already-absent favorite is not an error. */
  async remove(userId: string, productId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, productId } });
    return { success: true, favorited: false };
  }
}

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'favorites', version: '1' })
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.favorites.list(user.id);
  }

  @Post(':productId')
  add(@CurrentUser() user: RequestUser, @Param('productId') productId: string) {
    return this.favorites.add(user.id, productId);
  }

  @Delete(':productId')
  remove(@CurrentUser() user: RequestUser, @Param('productId') productId: string) {
    return this.favorites.remove(user.id, productId);
  }
}

@Module({
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
