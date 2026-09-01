import {
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { ProductSummary, VehicleDetail, VehicleSummary } from '@edalat/shared';

import {
  mapProductSummary,
  mapVehicleBrand,
  mapVehicleDetail,
  mapVehicleSummary,
  productSummarySelect,
  vehicleSummarySelect,
} from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async brands() {
    const rows = await this.prisma.vehicleBrand.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        logoUrl: true,
        country: true,
        // Only count active vehicles — an inactive one should not inflate the brand's displayed count.
        _count: { select: { vehicles: { where: { isActive: true } } } },
      },
    });
    return rows.map((row) => ({
      ...mapVehicleBrand(row),
      nameEn: row.nameEn,
      vehicleCount: row._count.vehicles,
    }));
  }

  /** Distinct model names for one vehicle brand — step 2 of the vehicle selector. */
  async models(brandSlug: string): Promise<string[]> {
    const rows = await this.prisma.vehicle.findMany({
      where: { isActive: true, brand: { slug: brandSlug } },
      select: { model: true },
      distinct: ['model'],
      orderBy: { model: 'asc' },
    });
    return rows.map((r) => r.model);
  }

  /** Variants (generation / engine / years) of one model — steps 3-5. */
  async variants(brandSlug: string, model: string): Promise<VehicleSummary[]> {
    const rows = await this.prisma.vehicle.findMany({
      where: { isActive: true, brand: { slug: brandSlug }, model },
      select: vehicleSummarySelect,
      orderBy: [{ yearFrom: 'desc' }, { engine: 'asc' }],
    });
    return rows.map(mapVehicleSummary);
  }

  /**
   * Accepts a slug or an id. Catalog URLs carry `vehicleId` (compatibility is
   * an id-level relation), while SEO pages use the slug — both need to resolve
   * to the same vehicle without a second endpoint.
   */
  async findBySlugOrId(slugOrId: string): Promise<VehicleDetail> {
    const row = await this.prisma.vehicle.findFirst({
      where: { isActive: true, OR: [{ slug: slugOrId }, { id: slugOrId }] },
      select: {
        ...vehicleSummarySelect,
        displacement: true,
        fuelType: true,
        transmission: true,
        bodyType: true,
        specifications: true,
        service: true,
      },
    });
    if (!row) throw new NotFoundException('خودرو یافت نشد.');
    return mapVehicleDetail(row);
  }

  /**
   * PRD §80 — parts that fit this vehicle. Grouped by category so the UI can
   * render "Oil filter / Air filter / Cabin filter" sections directly.
   */
  async products(vehicleId: string): Promise<{
    items: ProductSummary[];
    byCategory: Array<{ categoryId: string; categoryName: string; items: ProductSummary[] }>;
  }> {
    const rows = await this.prisma.productVehicleCompatibility.findMany({
      where: { vehicleId, product: { isActive: true } },
      select: {
        isExactFit: true,
        notes: true,
        replacementKm: true,
        replacementMonths: true,
        product: { select: productSummarySelect },
      },
      orderBy: [{ isExactFit: 'desc' }],
    });

    const items = rows.map((r) => mapProductSummary(r.product));

    const groups = new Map<string, { categoryId: string; categoryName: string; items: ProductSummary[] }>();
    for (const item of items) {
      const key = item.category?.id ?? 'uncategorized';
      const name = item.category?.name ?? 'سایر';
      if (!groups.has(key)) groups.set(key, { categoryId: key, categoryName: name, items: [] });
      groups.get(key)!.items.push(item);
    }

    return { items, byCategory: [...groups.values()] };
  }
}

@ApiTags('vehicles')
@Controller({ path: 'vehicles', version: '1' })
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get('brands')
  brands() {
    return this.vehicles.brands();
  }

  @Get('brands/:brandSlug/models')
  models(@Param('brandSlug') brandSlug: string) {
    return this.vehicles.models(brandSlug);
  }

  @Get('brands/:brandSlug/models/:model/variants')
  variants(@Param('brandSlug') brandSlug: string, @Param('model') model: string) {
    return this.vehicles.variants(brandSlug, decodeURIComponent(model));
  }

  @Get(':slugOrId')
  findOne(@Param('slugOrId') slugOrId: string) {
    return this.vehicles.findBySlugOrId(slugOrId);
  }

  @Get(':id/products')
  products(@Param('id') id: string, @Query('grouped') grouped?: string) {
    return this.vehicles.products(id).then((r) => (grouped === 'true' ? r.byCategory : r.items));
  }
}

@Module({
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
