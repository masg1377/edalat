import { Module } from '@nestjs/common';

import { SearchModule } from '../search/search.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  // The catalog delegates text ranking to SearchService rather than
  // re-implementing it, so the search module is a dependency, not a peer.
  imports: [SearchModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
