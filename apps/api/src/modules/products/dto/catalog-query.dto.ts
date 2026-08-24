import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CatalogSort, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PurchaseType } from '@edalat/shared';

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

/** Sort keys arrive from URLs, so accept `PRICE_ASC` as well as `price_asc`. */
const toSort = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj?.[key];
  return typeof raw === 'string' ? raw.toLowerCase() : raw;
};

/**
 * Query contract of `GET /products`.
 *
 * Every filter here is applied in the database. The browser only reflects these
 * values into the URL — it never decides which products qualify.
 */
export class CatalogQueryDto {
  /** Free-text / part-number query. Ranked by SearchService when present. */
  @IsOptional()
  @IsString()
  q?: string;

  /** Category slug. Slugs keep catalog URLs readable and indexable. */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  /** Id-based variants, for callers that already hold ids (e.g. facet chips). */
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  /**
   * Vehicle brand slug + model name, for the home-page quick search where the
   * customer picks a car but not a specific engine variant. Matches every
   * variant of that model.
   */
  @IsOptional()
  @IsString()
  vehicleBrand?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

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
  @Transform(toBool)
  @IsBoolean()
  inStock?: boolean;

  /** `WHOLESALE` narrows to products that actually have a wholesale tier. */
  @IsOptional()
  @IsEnum(PurchaseType)
  purchaseType?: PurchaseType;

  @IsOptional()
  @Transform(toSort)
  @IsEnum(CatalogSort)
  sort?: CatalogSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** Hard-capped server-side so a client cannot ask for the whole catalog. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;
}
