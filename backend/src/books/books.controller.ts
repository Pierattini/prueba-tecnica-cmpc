import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { AuditContext } from '../audit/audit.service';
import { AuditCtx } from '../common/decorators/audit-context.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BooksService, MAX_IMAGE_SIZE } from './books.service';
import { BookResponseDto, PaginatedBooksResponseDto } from './dto/book-response.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { BookFiltersDto, QueryBooksDto } from './dto/query-books.dto';
import { UpdateBookDto } from './dto/update-book.dto';

const uuidPipe = new ParseUUIDPipe({ version: '4' });

@ApiTags('books')
@ApiBearerAuth()
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Listar libros con filtros, búsqueda, orden y paginación' })
  @ApiOkResponse({ type: PaginatedBooksResponseDto })
  findAll(@Query() query: QueryBooksDto) {
    return this.booksService.findAll(query);
  }

  // las rutas fijas van antes de :id para que no las capture el parametro
  @Get('export')
  @ApiOperation({ summary: 'Exportar a CSV con los mismos filtros del listado' })
  @ApiProduces('text/csv')
  @ApiOkResponse({ description: 'Archivo CSV (UTF-8 con BOM)' })
  export(@Query() query: BookFiltersDto) {
    return this.booksService.exportCsv(query);
  }

  @Get('deleted')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar libros eliminados (papelera, solo ADMIN)' })
  @ApiOkResponse({ type: PaginatedBooksResponseDto })
  findDeleted(@Query() query: QueryBooksDto) {
    return this.booksService.findAll(query, true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un libro' })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', uuidPipe) id: string) {
    return this.booksService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear libro' })
  @ApiCreatedResponse({ type: BookResponseDto })
  create(@Body() dto: CreateBookDto, @AuditCtx() ctx: AuditContext) {
    return this.booksService.create(dto, ctx);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar libro (parcial)' })
  @ApiOkResponse({ type: BookResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateBookDto,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.booksService.update(id, dto, ctx);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar libro (soft delete, solo ADMIN)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', uuidPipe) id: string, @AuditCtx() ctx: AuditContext) {
    return this.booksService.remove(id, ctx);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Restaurar un libro eliminado (solo ADMIN)' })
  @ApiOkResponse({ type: BookResponseDto })
  restore(@Param('id', uuidPipe) id: string, @AuditCtx() ctx: AuditContext) {
    return this.booksService.restore(id, ctx);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE, files: 1 } }),
  )
  @ApiOperation({ summary: 'Subir imagen de portada (jpg, png o webp, máx 2MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: BookResponseDto })
  uploadImage(
    @Param('id', uuidPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @AuditCtx() ctx: AuditContext,
  ) {
    return this.booksService.uploadImage(id, file, ctx);
  }
}
