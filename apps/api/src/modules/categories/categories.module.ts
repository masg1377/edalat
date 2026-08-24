import { Controller, Get, Module, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CategorySummary } from '@edalat/shared';

import { categorySelect, mapCategory } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';

interface CategoryNode extends CategorySummary {
  children: CategoryNode[];
}

@ApiTags('categories')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

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
}

@Module({ controllers: [CategoriesController] })
export class CategoriesModule {}
