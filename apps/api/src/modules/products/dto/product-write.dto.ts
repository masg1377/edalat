import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Rule 2 (PRD §47) — one tier of `WholesalePriceRule`. `maxQuantity: null`
 * means "and above", same convention the public `WholesalePriceTier` uses. */
export class WholesaleTierDto {
  @IsInt()
  @Min(1)
  minQuantity!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxQuantity?: number | null;

  @IsNumber()
  @IsPositive()
  unitPrice!: number;
}

/** PRD §53 — admin create/update payload for `Product`. Mirrors the writable
 * columns of the Prisma model; read-only/derived fields (salesCount,
 * viewCount, ratingAverage/Count, reservedQuantity) are deliberately absent —
 * those are never set from the admin form. */
export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @MinLength(1)
  sku!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  technicalCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  oemCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  aliases?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  keywords?: string[];

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  mainImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  images?: string[];

  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;

  @IsNumber()
  @IsPositive()
  retailPrice!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  compareAtPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minWholesaleQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementKm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementKmMax?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementMonths?: number;

  @IsOptional()
  @IsString()
  replacementNotes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isManufactured?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  /** Rule 2 — replaces the product's entire tier set when present. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WholesaleTierDto)
  @ArrayMaxSize(20)
  wholesaleTiers?: WholesaleTierDto[];
}

// Same reasoning as UpdateVehicleDto — every field optional, but validated
// with the same rules as create when actually sent.
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  sku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  technicalCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  oemCodes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  aliases?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  keywords?: string[];

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  mainImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  images?: string[];

  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  retailPrice?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  compareAtPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minWholesaleQty?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementKm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementKmMax?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementMonths?: number;

  @IsOptional()
  @IsString()
  replacementNotes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isManufactured?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WholesaleTierDto)
  @ArrayMaxSize(20)
  wholesaleTiers?: WholesaleTierDto[];
}

/** PRD §46 — write side of `ProductVehicleCompatibility`. */
export class CreateCompatibilityDto {
  @IsString()
  @MinLength(1)
  vehicleId!: string;

  @IsOptional()
  @IsBoolean()
  isExactFit?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementKm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementKmMax?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementMonths?: number;
}

export class UpdateCompatibilityDto {
  @IsOptional()
  @IsBoolean()
  isExactFit?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementKm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementKmMax?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  replacementMonths?: number;
}
