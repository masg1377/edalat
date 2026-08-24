import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PurchaseType } from '@edalat/shared';

const toBool = ({ value }: { value: unknown }) => value === true || value === 'true' || value === '1';

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(PurchaseType)
  purchaseType?: PurchaseType;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  inStock?: boolean;

  /** Where the query came from — feeds the search analytics of PRD §67. */
  @IsOptional()
  @IsIn(['TEXT', 'VOICE', 'CODE', 'VEHICLE', 'IMAGE'])
  source?: string;

  @IsOptional()
  @IsString()
  sessionKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  pageSize: number = 24;
}
