import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @MinLength(1)
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  // en segundos
  @Type(() => Number)
  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN = 3600;

  @IsString()
  CORS_ORIGIN = 'http://localhost:5173';

  @IsString()
  UPLOAD_DIR = 'uploads';

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  THROTTLE_TTL = 60000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT = 100;

  @IsOptional()
  @IsString()
  PUBLIC_URL?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('; ');
    throw new Error(`Variables de entorno inválidas -> ${detail}`);
  }
  return validated;
}
