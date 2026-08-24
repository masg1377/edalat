import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PurchaseType } from '@edalat/shared';

/**
 * Reads the boolean from the *raw* query object, not from `value`.
 *
 * The global ValidationPipe runs with `enableImplicitConversion`, which casts
 * the string before `@Transform` sees it — and `Boolean('false')` is `true`.
 * Going back to `obj[key]` is what makes `?inStock=false` actually mean false.
 */
const toBool = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj?.[key];
  if (typeof raw === 'boolean') return raw;
  return raw === 'true' || raw === '1';
};

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
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;
}
