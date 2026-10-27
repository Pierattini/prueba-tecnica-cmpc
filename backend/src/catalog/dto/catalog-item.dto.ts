import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CatalogItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Gabriel García Márquez' })
  name: string;
}

export class CreateCatalogItemDto {
  @ApiProperty({ example: 'Gabriel García Márquez' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;
}

export class CatalogQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por nombre (contiene)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
