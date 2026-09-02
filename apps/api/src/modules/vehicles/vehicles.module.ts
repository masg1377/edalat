import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import type { ProductSummary, VehicleDetail, VehicleSummary } from '@edalat/shared';
import { UserRole, slugify } from '@edalat/shared';

import { JwtAuthGuard, Roles, RolesGuard } from '../../common/auth.decorators';
import {
  mapProductSummary,
  mapVehicleBrand,
  mapVehicleDetail,
  mapVehicleSummary,
  productSummarySelect,
  vehicleSummarySelect,
} from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle-write.dto';

/** One `ProductVehicleCompatibility` row, fully expanded — the admin-facing
 * shape `GET /vehicles/:id/compatibility` returns so a row can be edited or
 * removed by its own id. The public `GET /vehicles/:id/products` deliberately
 * does not expose this (PRD §20 only needs the product list, not the join
 * row), so this is a second, admin-oriented read next to it, not a
 * replacement. */
export interface CompatibilityRow {
  id: string;
  product: ProductSummary;
  isExactFit: boolean;
  notes: string | null;
  replacementKm: number | null;
  replacementKmMax: number | null;
  replacementMonths: number | null;
}

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

  /**
   * Admin-facing flat list — PRD §54. Not exposed on the storefront (which
   * drills brand → model → variant instead), but the admin table needs a
   * plain paginated "every vehicle" view with a brand/text filter.
   */
  async listAll(params: { brandId?: string; q?: string; page?: number; limit?: number }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;

    const where: Prisma.VehicleWhereInput = {
      ...(params.brandId ? { brandId: params.brandId } : {}),
      ...(params.q ? { model: { contains: params.q, mode: 'insensitive' } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        select: vehicleSummarySelect,
        orderBy: [{ brand: { name: 'asc' } }, { model: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { items: rows.map(mapVehicleSummary), total, page, limit };
  }

  /** Admin-facing — see `CompatibilityRow` doc comment. */
  async compatibilityFor(vehicleId: string): Promise<CompatibilityRow[]> {
    const rows = await this.prisma.productVehicleCompatibility.findMany({
      where: { vehicleId },
      select: {
        id: true,
        isExactFit: true,
        notes: true,
        replacementKm: true,
        replacementKmMax: true,
        replacementMonths: true,
        product: { select: productSummarySelect },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      product: mapProductSummary(r.product),
      isExactFit: r.isExactFit,
      notes: r.notes ?? null,
      replacementKm: r.replacementKm ?? null,
      replacementKmMax: r.replacementKmMax ?? null,
      replacementMonths: r.replacementMonths ?? null,
    }));
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = slugify(base) || 'vehicle';
    let candidate = root;
    let suffix = 2;
    for (;;) {
      const existing = await this.prisma.vehicle.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      candidate = `${root}-${suffix++}`;
    }
  }

  async create(dto: CreateVehicleDto): Promise<VehicleDetail> {
    const brand = await this.prisma.vehicleBrand.findUnique({ where: { id: dto.brandId } });
    if (!brand) throw new NotFoundException('برند خودرو یافت نشد.');

    const slugBase = dto.slug?.trim() || [brand.slug, dto.model, dto.engine].filter(Boolean).join('-');
    const slug = await this.uniqueSlug(slugBase);

    const row = await this.prisma.vehicle.create({
      data: {
        brandId: dto.brandId,
        model: dto.model,
        slug,
        generation: dto.generation,
        yearFrom: dto.yearFrom,
        yearTo: dto.yearTo,
        bodyType: dto.bodyType,
        engine: dto.engine,
        engineCode: dto.engineCode,
        displacement: dto.displacement,
        fuelType: dto.fuelType,
        transmission: dto.transmission,
        imageUrl: dto.imageUrl,
        specifications: dto.specifications ?? {},
        isActive: dto.isActive ?? true,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        ...(dto.service ? { service: { create: dto.service } } : {}),
      },
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
    return mapVehicleDetail(row);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleDetail> {
    if (dto.brandId) {
      const brand = await this.prisma.vehicleBrand.findUnique({ where: { id: dto.brandId } });
      if (!brand) throw new NotFoundException('برند خودرو یافت نشد.');
    }
    const slug = dto.slug?.trim() ? await this.uniqueSlug(dto.slug, id) : undefined;

    try {
      const row = await this.prisma.vehicle.update({
        where: { id },
        data: {
          ...(dto.brandId !== undefined ? { brandId: dto.brandId } : {}),
          ...(dto.model !== undefined ? { model: dto.model } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(dto.generation !== undefined ? { generation: dto.generation } : {}),
          ...(dto.yearFrom !== undefined ? { yearFrom: dto.yearFrom } : {}),
          ...(dto.yearTo !== undefined ? { yearTo: dto.yearTo } : {}),
          ...(dto.bodyType !== undefined ? { bodyType: dto.bodyType } : {}),
          ...(dto.engine !== undefined ? { engine: dto.engine } : {}),
          ...(dto.engineCode !== undefined ? { engineCode: dto.engineCode } : {}),
          ...(dto.displacement !== undefined ? { displacement: dto.displacement } : {}),
          ...(dto.fuelType !== undefined ? { fuelType: dto.fuelType } : {}),
          ...(dto.transmission !== undefined ? { transmission: dto.transmission } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
          ...(dto.specifications !== undefined ? { specifications: dto.specifications } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle } : {}),
          ...(dto.metaDescription !== undefined ? { metaDescription: dto.metaDescription } : {}),
          ...(dto.service !== undefined
            ? { service: { upsert: { create: dto.service, update: dto.service } } }
            : {}),
        },
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
      return mapVehicleDetail(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('خودرو یافت نشد.');
      }
      throw error;
    }
  }

  /**
   * Hard delete. Safe: `service`, `compatibilities` and `savedBy` are all
   * `onDelete: Cascade` on `Vehicle` in the schema.
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prisma.vehicle.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('خودرو یافت نشد.');
      }
      throw error;
    }
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

  /** PRD §54 — admin flat list, must be declared before `:slugOrId` below. */
  @Get()
  list(@Query('brandId') brandId?: string, @Query('q') q?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.vehicles.listAll({
      brandId,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':slugOrId')
  findOne(@Param('slugOrId') slugOrId: string) {
    return this.vehicles.findBySlugOrId(slugOrId);
  }

  @Get(':id/products')
  products(@Param('id') id: string, @Query('grouped') grouped?: string) {
    return this.vehicles.products(id).then((r) => (grouped === 'true' ? r.byCategory : r.items));
  }

  /** Admin-facing — see `VehiclesService.compatibilityFor` doc comment. */
  @Get(':id/compatibility')
  compatibility(@Param('id') id: string) {
    return this.vehicles.compatibilityFor(id);
  }

  /** PRD §54 — admin vehicle management. */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER)
  create(@Body() dto: CreateVehicleDto) {
    return this.vehicles.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    await this.vehicles.remove(id);
    return { ok: true };
  }
}

@Module({
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
