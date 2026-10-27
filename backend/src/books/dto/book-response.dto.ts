import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CatalogItemDto } from '../../catalog/dto/catalog-item.dto';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';

export class BookResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: CatalogItemDto })
  author: CatalogItemDto;

  @ApiProperty({ type: CatalogItemDto })
  publisher: CatalogItemDto;

  @ApiProperty({ type: CatalogItemDto })
  genre: CatalogItemDto;

  @ApiProperty({ example: 15990 })
  price: number;

  @ApiProperty({ example: 10 })
  stock: number;

  @ApiProperty({ description: 'Derivado de stock > 0' })
  isAvailable: boolean;

  @ApiPropertyOptional({ nullable: true, example: '/uploads/books/uuid.jpg' })
  imageUrl: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  deletedAt: Date | null;
}

export class PaginatedBooksResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [BookResponseDto] })
  data: BookResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
