import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IdentificationStatus } from '@edalat/shared';

import { CurrentUser, JwtAuthGuard, type RequestUser } from '../../common/auth.decorators';
import { mapProductSummary, productSummarySelect } from '../../common/mappers';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateIdentificationRequestDto {
  /** Uploaded first via /uploads; this endpoint receives the resulting URLs. */
  @IsArray()
  @ArrayMinSize(1, { message: 'حداقل یک تصویر لازم است.' })
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images!: string[];

  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() vehicleLabel?: string;
  @IsOptional() @IsString() possibleName?: string;
  @IsOptional() @IsString() possibleCode?: string;
  @IsOptional() @IsString() brandGuess?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) quantity?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() contactPhone?: string;
}

@Injectable()
export class ProductRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private static reference(): string {
    return `IMG-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;
  }

  /**
   * PRD §11 / Rule 5 — in the MVP this is human-assisted: the customer sends a
   * photo, staff identify the part. The record already carries the fields an
   * AI pipeline would later fill (identifiedProductId, possibleCode), so
   * adding recognition means writing to the same rows, not reshaping them.
   */
  async create(dto: CreateIdentificationRequestDto, userId?: string) {
    return this.prisma.productIdentificationRequest.create({
      data: {
        ...dto,
        quantity: dto.quantity ?? 1,
        referenceNumber: ProductRequestsService.reference(),
        userId: userId ?? null,
        status: IdentificationStatus.SUBMITTED,
        events: {
          create: { toStatus: IdentificationStatus.SUBMITTED, note: 'تصویر دریافت شد.' },
        },
      },
      select: { id: true, referenceNumber: true, status: true, createdAt: true },
    });
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.productIdentificationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { identifiedProduct: { select: productSummarySelect } },
    });
    return rows.map((row) => ({
      id: row.id,
      referenceNumber: row.referenceNumber,
      status: row.status,
      images: row.images,
      possibleCode: row.possibleCode,
      vehicleLabel: row.vehicleLabel,
      adminResponse: row.adminResponse,
      identifiedProduct: row.identifiedProduct ? mapProductSummary(row.identifiedProduct) : null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async findOne(userId: string, id: string) {
    const row = await this.prisma.productIdentificationRequest.findFirst({
      where: { id, userId },
      include: {
        identifiedProduct: { select: productSummarySelect },
        events: { where: { isPublic: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('درخواست یافت نشد.');
    return row;
  }
}

@ApiTags('product-requests')
@Controller({ path: 'product-requests', version: '1' })
export class ProductRequestsController {
  constructor(private readonly requests: ProductRequestsService) {}

  /**
   * Guests may submit. PRD §88 — a failed search must never be a dead end, and
   * forcing a login here is exactly the kind of dead end that loses the lead.
   */
  @Post()
  create(@Body() dto: CreateIdentificationRequestDto, @CurrentUser() user?: RequestUser) {
    return this.requests.create(dto, user?.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.requests.listForUser(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.requests.findOne(user.id, id);
  }
}

@Module({
  controllers: [ProductRequestsController],
  providers: [ProductRequestsService],
  exports: [ProductRequestsService],
})
export class ProductRequestsModule {}
