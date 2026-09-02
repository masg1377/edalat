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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import type { CategorySummary } from '@edalat/shared';
import { UserRole, slugify } from '@edalat/shared';

import { JwtAuthGuard, Roles, RolesGuard } from '../../common/auth.decorators';
import { categorySelect, mapCategory } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';

interface CategoryNode extends CategorySummary {
  children: CategoryNode[];
}

/** PRD §54/§14 — admin create/update payload. `slug` is optional: derived from
 * `name` with `slugify()` (and de-duplicated) when omitted, same convention
 * `ProductsService.create()` uses. */
export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Appends `-2`, `-3`, … until the slug is free. Mirrors ProductsService. */
  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = slugify(base) || 'category';
    let candidate = root;
    let suffix = 2;
    // A handful of categories are created at a time from the admin panel —
    // a loop here is simpler and clear enough not to need a smarter query.
    for (;;) {
      const existing = await this.prisma.category.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      candidate = `${root}-${suffix++}`;
    }
  }

  async create(dto: CreateCategoryDto): Promise<CategorySummary> {
    const slug = dto.slug?.trim() ? await this.uniqueSlug(dto.slug) : await this.uniqueSlug(dto.name);
    const row = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        iconUrl: dto.iconUrl,
        parentId: dto.parentId,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      select: categorySelect,
    });
    return mapCategory(row)!;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategorySummary> {
    const slug = dto.slug?.trim() ? await this.uniqueSlug(dto.slug, id) : undefined;
    try {
      const row = await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
          ...(dto.iconUrl !== undefined ? { iconUrl: dto.iconUrl } : {}),
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
        select: categorySelect,
      });
      return mapCategory(row)!;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('دسته‌بندی یافت نشد.');
      }
      throw error;
    }
  }

  /**
   * Hard delete. Safe: `Product.categoryId` and the parent/children
   * self-relation are both `onDelete: SetNull` in the schema, so removing a
   * category never orphans a foreign key — it just clears it.
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('دسته‌بندی یافت نشد.');
      }
      throw error;
    }
  }
}

@ApiTags('categories')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  /** Flat list, ready to be rendered as a menu or filter panel. */
  @Get()
  async list() {
    const rows = await this.prisma.category.findMany({
      where: { isActive: true },
      select: { ...categorySelect, _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => mapCategory(r)!);
  }

  /** PRD §14 — the dynamic tree, assembled in one query. */
  @Get('tree')
  async tree(): Promise<CategoryNode[]> {
    const rows = await this.prisma.category.findMany({
      where: { isActive: true },
      select: { ...categorySelect, _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const byId = new Map<string, CategoryNode>();
    for (const row of rows) {
      byId.set(row.id, { ...mapCategory(row)!, children: [] });
    }

    const roots: CategoryNode[] = [];
    for (const node of byId.values()) {
      const parent = node.parentId ? byId.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const row = await this.prisma.category.findFirst({
      where: { slug, isActive: true },
      select: {
        ...categorySelect,
        description: true,
        _count: { select: { products: true } },
        children: { where: { isActive: true }, select: categorySelect },
      },
    });
    if (!row) throw new NotFoundException('دسته‌بندی یافت نشد.');
    return {
      ...mapCategory(row)!,
      description: row.description,
      children: row.children.map((c) => mapCategory(c)!),
    };
  }

  /** PRD §53/§54 — admin catalog management. */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER)
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CONTENT_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    await this.categories.remove(id);
    return { ok: true };
  }
}

@Module({ controllers: [CategoriesController], providers: [CategoriesService] })
export class CategoriesModule {}
