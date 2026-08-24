import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PurchaseType } from '@edalat/shared';

import { PricingService } from '../pricing/pricing.service';
import { ListProductsDto } from './dto/list-products.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly pricing: PricingService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated, filterable product catalog.' })
  list(@Query() dto: ListProductsDto) {
    return this.products.list(dto);
  }

  @Get('featured')
  featured(@Query('limit') limit?: string) {
    return this.products.featured(limit ? Number(limit) : 8);
  }

  @Get('best-selling')
  bestSelling(@Query('limit') limit?: string) {
    return this.products.bestSelling(limit ? Number(limit) : 8);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }

  /** PRD §80 */
  @Get(':id/vehicles')
  vehicles(@Param('id') id: string) {
    return this.products.vehiclesFor(id);
  }

  /** PRD §20 */
  @Get(':slug/shared-with/:vehicleId')
  shared(@Param('slug') slug: string, @Param('vehicleId') vehicleId: string) {
    return this.products.sharedCompatibility(slug, vehicleId);
  }

  /**
   * PRD §81 — authoritative price for a (product, purchaseType, quantity).
   * The product page calls this on every quantity change so the displayed
   * price always comes from the same code path that bills the customer.
   */
  @Get(':id/price')
  price(
    @Param('id') id: string,
    @Query('quantity', ParseIntPipe) quantity: number,
    @Query('purchaseType') purchaseType: PurchaseType = PurchaseType.RETAIL,
  ) {
    return this.pricing.quote(id, purchaseType, quantity);
  }
}
