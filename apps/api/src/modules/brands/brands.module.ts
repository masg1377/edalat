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
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import type { BrandSummary } from '@edalat/shared';
import { UserRole, slugify } from '@edalat/shared';

import { JwtAuthGuard, Roles, RolesGuard } from '../../common/auth.decorators';
import { brandSelect, mapBrand } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';

/** PRD §53/§54 — admin create/update payload for `Brand`. */
export class CreateBrandDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateBrandDto extends PartialType(CreateBrandDto) {}

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = slugify(base) || 'brand';
    let candidate = root;
    let suffix = 2;
    for (;;) {
      const existing = await this.prisma.brand.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      candidate = `${root}-${suffix++}`;
    }
  }

  async create(dto: CreateBrandDto): Promise<BrandSummary> {
    const slug = dto.slug?.trim() ? await this.uniqueSlug(dto.slug) : await this.uniqueSlug(dto.name);
    try {
      const row = await this.prisma.brand.create({
        data: {
          name: dto.name,
          slug,
          logoUrl: dto.logoUrl,
          description: dto.description,
          country: dto.country,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
        select: brandSelect,
      });
      return mapBrand(row)!;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new NotFoundException('برندی با این نام از قبل ثبت شده است.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateBrandDto): Promise<BrandSummary> {
    const slug = dto.slug?.trim() ? await this.uniqueSlug(dto.slug, id) : undefined;
    try {
      const row = await this.prisma.brand.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.country !== undefined ? { country: dto.country } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
        select: brandSelect,
      });
      return mapBrand(row)!;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('برند یافت نشد.');
      }
      throw error;
    }
  }

  /**
   * Hard delete. Safe: `Product.brandId` is `onDelete: SetNull` in the
   * schema, so removing a brand never orphans a foreign key.
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prisma.brand.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('برند یافت نشد.');
      }
      throw error;
    }
  }
}

@ApiTags('brands')
@Controller({ path: 'brands', version: '1' })
export class BrandsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brands: BrandsService,
  ) {}

  @Get()
  async list(@Query('limit') limit?: string) {
    const rows = await this.prisma.brand.findMany({
      where: { isActive: true },
      select: { ...brandSelect, _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      ...(limit ? { take: Number(limit) } : {}),
    });
    return rows.map((row) => ({ ...mapBrand(row)!, productCount: row._count.products }));
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const row = await this.prisma.brand.findFirst({
      where: { slug, isActive: true },
      select: { ...brandSelect, description: true },
    });
    if (!row) throw new NotFoundException('برند یافت نشد.');
    return { ...mapBrand(row)!, description: row.description };
  }

  /** PRD §53/§54 — admin catalog management. */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER)
  create(@Body() dto: CreateBrandDto) {
    return this.brands.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brands.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    await this.brands.remove(id);
    return { ok: true };
  }
}

@Module({ controllers: [BrandsController], providers: [BrandsService] })
export class BrandsModule {}
