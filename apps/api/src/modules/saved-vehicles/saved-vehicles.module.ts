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
import { mapVehicleSummary, vehicleSummarySelect } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * PRD §26/§31 — «خودروی من». Structurally and behaviorally identical to
 * `FavoritesModule` (`../favorites/favorites.module.ts`), just on `Vehicle`
 * instead of `Product`: the `SavedVehicle` model existed in the schema
 * (and its migration) with zero code touching it — the Dashboard Overview's
 * "به‌زودی" card had nothing real behind it. This module, plus a save
 * toggle on the vehicle detail page, is what fills it in.
 */
@Injectable()
export class SavedVehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Full vehicle info, not just ids — mirrors FavoritesService.list(). */
  async list(userId: string) {
    const rows = await this.prisma.savedVehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { vehicle: { select: vehicleSummarySelect } },
    });
    return rows.map((row) => mapVehicleSummary(row.vehicle));
  }

  /**
   * Idempotent: `upsert` on the `[userId, vehicleId]` unique index just
   * no-ops when the vehicle is already saved — mirrors FavoritesService.add().
   */
  async add(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('خودرو یافت نشد.');

    await this.prisma.savedVehicle.upsert({
      where: { userId_vehicleId: { userId, vehicleId } },
      create: { userId, vehicleId },
      update: {},
    });
    return { success: true, saved: true };
  }

  /** Also idempotent — removing an already-absent saved vehicle is not an error. */
  async remove(userId: string, vehicleId: string) {
    await this.prisma.savedVehicle.deleteMany({ where: { userId, vehicleId } });
    return { success: true, saved: false };
  }
}

@ApiTags('saved-vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'saved-vehicles', version: '1' })
export class SavedVehiclesController {
  constructor(private readonly savedVehicles: SavedVehiclesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.savedVehicles.list(user.id);
  }

  @Post(':vehicleId')
  add(@CurrentUser() user: RequestUser, @Param('vehicleId') vehicleId: string) {
    return this.savedVehicles.add(user.id, vehicleId);
  }

  @Delete(':vehicleId')
  remove(@CurrentUser() user: RequestUser, @Param('vehicleId') vehicleId: string) {
    return this.savedVehicles.remove(user.id, vehicleId);
  }
}

@Module({
  controllers: [SavedVehiclesController],
  providers: [SavedVehiclesService],
  exports: [SavedVehiclesService],
})
export class SavedVehiclesModule {}
