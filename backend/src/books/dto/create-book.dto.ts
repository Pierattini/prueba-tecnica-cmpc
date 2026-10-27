import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateBookDto {
  @ApiProperty({ example: 'Cien años de soledad', maxLength: 255 })
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'El título es obligatorio' })
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'Gabriel García Márquez',
    description: 'Nombre del autor; si no existe se crea',
  })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  author: string;

  @ApiProperty({ example: 'Sudamericana', description: 'Nombre de la editorial; si no existe se crea' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  publisher: string;

  @ApiProperty({ example: 'Novela', description: 'Nombre del género; si no existe se crea' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  genre: string;

  @ApiProperty({ example: 15990, minimum: 0, maximum: 99999999.99 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(99999999.99)
  price: number;

  @ApiProperty({ example: 10, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock: number;
}
