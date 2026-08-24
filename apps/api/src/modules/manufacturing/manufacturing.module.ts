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
import { IsArray, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ManufacturingStatus } from '@edalat/shared';

import { CurrentUser, JwtAuthGuard, type RequestUser } from '../../common/auth.decorators';
import { PrismaService } from '../../prisma/prisma.service';

/** Mirrors the six steps of the multi-step form in PRD §28. */
export class CreateManufacturingRequestDto {
  // Step 1 — customer
  @IsString() @MinLength(2) contactName!: string;
  @IsOptional() @IsString() companyName?: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() preferredContactMethod?: string;

  // Step 2 — brand
  @IsString() @MinLength(2) brandName!: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() packagingDesignUrl?: string;

  // Step 3 — product
  @IsOptional() @IsString() productCategoryId?: string;
  @IsString() productType!: string;
  @IsOptional() @IsString() productName?: string;
  @IsOptional() @IsString() technicalCode?: string;
  @IsOptional() @IsString() targetVehicles?: string;
  @Type(() => Number) @IsInt() @Min(1) quantity!: number;

  // Step 4 — reference material
  @IsOptional() @IsString() productImageUrl?: string;
  @IsOptional() @IsString() sampleImageUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) attachments?: string[];

  // Step 5 — description
  @IsOptional() @IsString() description?: string;
}

@Injectable()
export class ManufacturingService {
  constructor(private readonly prisma: PrismaService) {}

  private static reference(): string {
    return `MFG-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;
  }

  /**
   * A production enquiry is explicitly NOT a purchase (PRD §3.3): it creates a
   * request with its own status machine and an event trail the customer can follow.
   */
  async create(dto: CreateManufacturingRequestDto, userId?: string) {
    const request = await this.prisma.manufacturingRequest.create({
      data: {
        ...dto,
        attachments: dto.attachments ?? [],
        referenceNumber: ManufacturingService.reference(),
        userId: userId ?? null,
        status: ManufacturingStatus.SUBMITTED,
        events: {
          create: { toStatus: ManufacturingStatus.SUBMITTED, note: 'درخواست ثبت شد.' },
        },
      },
      select: { id: true, referenceNumber: true, status: true, createdAt: true },
    });
    return request;
  }

  async listForUser(userId: string) {
    return this.prisma.manufacturingRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        brandName: true,
        productType: true,
        quantity: true,
        quotedUnitPrice: true,
        createdAt: true,
      },
    });
  }

  async findOne(userId: string, id: string) {
    const row = await this.prisma.manufacturingRequest.findFirst({
      where: { id, userId },
      include: {
        events: { where: { isPublic: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('درخواست یافت نشد.');
    return row;
  }
}

@ApiTags('manufacturing')
@Controller({ path: 'manufacturing', version: '1' })
export class ManufacturingController {
  constructor(private readonly manufacturing: ManufacturingService) {}

  /** Open to guests — a lead should never be blocked behind a login. */
  @Post('requests')
  create(@Body() dto: CreateManufacturingRequestDto, @CurrentUser() user?: RequestUser) {
    return this.manufacturing.create(dto, user?.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('requests')
  list(@CurrentUser() user: RequestUser) {
    return this.manufacturing.listForUser(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('requests/:id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.manufacturing.findOne(user.id, id);
  }
}

@Module({
  controllers: [ManufacturingController],
  providers: [ManufacturingService],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
