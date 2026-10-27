import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CatalogItemDto, CatalogQueryDto, CreateCatalogItemDto } from './dto/catalog-item.dto';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('authors')
  @ApiOperation({ summary: 'Listar autores' })
  @ApiOkResponse({ type: [CatalogItemDto] })
  listAuthors(@Query() query: CatalogQueryDto) {
    return this.catalog.list('authors', query.search);
  }

  @Post('authors')
  @ApiOperation({ summary: 'Crear autor' })
  @ApiCreatedResponse({ type: CatalogItemDto })
  createAuthor(@Body() dto: CreateCatalogItemDto) {
    return this.catalog.create('authors', dto.name);
  }

  @Get('publishers')
  @ApiOperation({ summary: 'Listar editoriales' })
  @ApiOkResponse({ type: [CatalogItemDto] })
  listPublishers(@Query() query: CatalogQueryDto) {
    return this.catalog.list('publishers', query.search);
  }

  @Post('publishers')
  @ApiOperation({ summary: 'Crear editorial' })
  @ApiCreatedResponse({ type: CatalogItemDto })
  createPublisher(@Body() dto: CreateCatalogItemDto) {
    return this.catalog.create('publishers', dto.name);
  }

  @Get('genres')
  @ApiOperation({ summary: 'Listar géneros' })
  @ApiOkResponse({ type: [CatalogItemDto] })
  listGenres(@Query() query: CatalogQueryDto) {
    return this.catalog.list('genres', query.search);
  }

  @Post('genres')
  @ApiOperation({ summary: 'Crear género' })
  @ApiCreatedResponse({ type: CatalogItemDto })
  createGenre(@Body() dto: CreateCatalogItemDto) {
    return this.catalog.create('genres', dto.name);
  }
}
