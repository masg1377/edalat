import Link from 'next/link';
import type { CategorySummary, SearchFacets } from '@edalat/shared';
import { PurchaseType, toPersianDigits } from '@edalat/shared';

import { buildCatalogHref, hasActiveFilters, type CatalogParams } from '@/lib/catalog-params';
import { FilterOption, FilterSection } from './filter-section';
import { PriceRangeFilter } from './price-range-filter';
import { VehicleFilter } from './vehicle-filter';

interface FiltersPanelProps {
  params: CatalogParams;
  facets: SearchFacets;
  /** Full category list, so a category with zero current hits is still offered. */
  categories: CategorySummary[];
  vehicleBrands: Array<{ id: string; name: string; slug: string }>;
  selectedVehicleLabel?: string | null;
}

export function FiltersPanel({
  params,
  facets,
  categories,
  vehicleBrands,
  selectedVehicleLabel,
}: FiltersPanelProps) {
  const countOf = (slug: string, source: SearchFacets['categories' | 'brands']) =>
    source.find((entry) => entry.slug === slug)?.count;

  return (
    <div className="filters-panel rounded-card bg-white">
      <h2 className="filters-title">فیلتر محصولات</h2>
      {hasActiveFilters(params) && (
        <div className="border-b border-ink-100 pb-4">
          <Link
            href={params.q ? `/products?q=${encodeURIComponent(params.q)}` : '/products'}
            className="text-sm font-bold text-ink-600 underline underline-offset-4 hover:text-ink-900"
          >
            حذف همه فیلترها
          </Link>
        </div>
      )}

      <FilterSection title="دسته‌بندی">
        <div className="space-y-1">
          <FilterOption
            href={buildCatalogHref(params, { category: '' })}
            label="همه دسته‌ها"
            active={!params.category}
          />
          {categories.map((category) => {
            const count = countOf(category.slug, facets.categories);
            return (
              <FilterOption
                key={category.id}
                href={buildCatalogHref(params, { category: category.slug })}
                label={category.name}
                active={params.category === category.slug}
                countLabel={count !== undefined ? toPersianDigits(count) : undefined}
              />
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="برند">
        <div className="space-y-1">
          <FilterOption
            href={buildCatalogHref(params, { brand: '' })}
            label="همه برندها"
            active={!params.brand}
          />
          {facets.brands.map((brand) => (
            <FilterOption
              key={brand.id}
              href={buildCatalogHref(params, { brand: brand.slug })}
              label={brand.name}
              active={params.brand === brand.slug}
              countLabel={toPersianDigits(brand.count)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="خودرو">
        <VehicleFilter
          params={params}
          brands={vehicleBrands}
          selectedLabel={selectedVehicleLabel}
        />
      </FilterSection>

      <FilterSection title="نوع خرید">
        <div className="space-y-1">
          <FilterOption
            href={buildCatalogHref(params, { purchaseType: null })}
            label="همه"
            active={params.purchaseType === null}
          />
          <FilterOption
            href={buildCatalogHref(params, { purchaseType: PurchaseType.RETAIL })}
            label="خرده"
            active={params.purchaseType === PurchaseType.RETAIL}
          />
          <FilterOption
            href={buildCatalogHref(params, { purchaseType: PurchaseType.WHOLESALE })}
            label="عمده"
            active={params.purchaseType === PurchaseType.WHOLESALE}
          />
        </div>
      </FilterSection>

      <FilterSection title="موجودی">
        <div className="space-y-1">
          <FilterOption
            href={buildCatalogHref(params, { inStock: false })}
            label="همه"
            active={!params.inStock}
          />
          <FilterOption
            href={buildCatalogHref(params, { inStock: true })}
            label="فقط موجود"
            active={params.inStock}
          />
        </div>
      </FilterSection>

      <FilterSection title="محدوده قیمت (تومان)">
        <PriceRangeFilter params={params} bounds={facets.priceRange} />
      </FilterSection>
    </div>
  );
}
