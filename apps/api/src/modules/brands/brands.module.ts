import { Controller, Get, Module, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { brandSelect, mapBrand } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('brands')
@Controller({ path: 'brands', version: '1' })
export class BrandsController {
  constructor(private readonly prisma: PrismaService) {}

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
}

@Module({ controllers: [BrandsController] })
export class BrandsModule {}
