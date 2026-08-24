import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  query(@Query() dto: SearchQueryDto) {
    return this.search.search(dto);
  }

  @Get('suggestions')
  suggestions(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.search.suggest(q ?? '', limit ? Number(limit) : 8);
  }
}

@Module({
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
