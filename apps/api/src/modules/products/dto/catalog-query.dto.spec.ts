import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CatalogSort, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PurchaseType } from '@edalat/shared';

import { CatalogQueryDto } from './catalog-query.dto';

/** Mirrors how Nest's global ValidationPipe is configured in `main.ts`. */
function parse(query: Record<string, unknown>) {
  const dto = plainToInstance(CatalogQueryDto, query, { enableImplicitConversion: true });
  return { dto, errors: validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }) };
}

describe('CatalogQueryDto — paging', () => {
  it('defaults to page 1 and the default page size', () => {
    const { dto, errors } = parse({});
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(DEFAULT_PAGE_SIZE);
  });

  it('accepts a limit at the ceiling', () => {
    const { dto, errors } = parse({ limit: String(MAX_PAGE_SIZE) });
    expect(errors).toHaveLength(0);
    expect(dto.limit).toBe(MAX_PAGE_SIZE);
  });

  it('rejects a limit above the ceiling so a client cannot pull the catalog', () => {
    const { errors } = parse({ limit: String(MAX_PAGE_SIZE + 1) });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('limit');
  });

  it('rejects a zero or negative page', () => {
    expect(parse({ page: '0' }).errors).toHaveLength(1);
    expect(parse({ page: '-3' }).errors).toHaveLength(1);
  });
});

describe('CatalogQueryDto — coercion', () => {
  it('accepts lowercase sort keys from URLs', () => {
    const { dto, errors } = parse({ sort: 'price_asc' });
    expect(errors).toHaveLength(0);
    expect(dto.sort).toBe(CatalogSort.PRICE_ASC);
  });

  it('still accepts the uppercase form', () => {
    const { dto, errors } = parse({ sort: 'PRICE_DESC' });
    expect(errors).toHaveLength(0);
    expect(dto.sort).toBe(CatalogSort.PRICE_DESC);
  });

  it('rejects an unknown sort key rather than silently ignoring it', () => {
    expect(parse({ sort: 'cheapest' }).errors).toHaveLength(1);
  });

  it('coerces the inStock flag from its URL string form', () => {
    expect(parse({ inStock: 'true' }).dto.inStock).toBe(true);
    expect(parse({ inStock: '1' }).dto.inStock).toBe(true);
    expect(parse({ inStock: 'false' }).dto.inStock).toBe(false);
  });

  it('accepts a purchase type', () => {
    const { dto, errors } = parse({ purchaseType: 'WHOLESALE' });
    expect(errors).toHaveLength(0);
    expect(dto.purchaseType).toBe(PurchaseType.WHOLESALE);
  });

  it('rejects unknown query parameters', () => {
    const { errors } = parse({ notAFilter: 'x' });
    expect(errors).toHaveLength(1);
  });
});
