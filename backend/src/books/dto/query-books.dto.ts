import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { BOOK_SORT_FIELDS } from '../repositories/books.repository';

// se lee el valor crudo porque Boolean('false') daria true
const toBoolean = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  if (raw === '') return undefined;
  if (raw === 'true' || raw === true) return true;
  if (raw === 'false' || raw === false) return false;
  return raw;
};

// un filtro vacio en la query (?genreId=) se trata como si no viniera
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class BookFiltersDto {
  @ApiPropertyOptional({ description: 'Busca por título o autor', example: 'soledad' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID('all', { message: 'genreId debe ser un UUID' })
  genreId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID('all', { message: 'publisherId debe ser un UUID' })
  publisherId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID('all', { message: 'authorId debe ser un UUID' })
  authorId?: string;

  @ApiPropertyOptional({ description: 'true = con stock, false = sin stock' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean({ message: 'available debe ser true o false' })
  available?: boolean;

  @ApiPropertyOptional({
    description: `Orden múltiple "campo:dir" separado por comas. Campos: ${BOOK_SORT_FIELDS.join(', ')}`,
    example: 'price:desc,title:asc',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-zA-Z]+(:(asc|desc))?(,[a-zA-Z]+(:(asc|desc))?)*$/i, {
    message: 'sort debe tener el formato campo:asc|desc separado por comas',
  })
  sort?: string;
}

export class QueryBooksDto extends IntersectionType(PaginationQueryDto, BookFiltersDto) {}
