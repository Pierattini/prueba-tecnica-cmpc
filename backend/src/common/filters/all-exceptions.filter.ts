import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

export interface ErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
  path: string;
  timestamp: string;
}

type ResolvedError = Pick<ErrorResponse, 'statusCode' | 'error' | 'message' | 'details'>;

const PRISMA_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Ya existe un registro con esos datos' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'El registro solicitado no existe' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'La referencia a otro registro no es válida' },
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const resolved = this.resolve(exception);

    if (resolved.statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${resolved.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponse = {
      success: false,
      ...resolved,
      path: req.url,
      timestamp: new Date().toISOString(),
    };
    res.status(resolved.statusCode).json(body);
  }

  resolve(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) return this.fromHttpException(exception);

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERRORS[exception.code];
      if (mapped) {
        const target = (exception.meta?.target as string[] | string | undefined) ?? undefined;
        return {
          statusCode: mapped.status,
          error: HttpStatus[mapped.status],
          message: mapped.message,
          details: target ? [`campo: ${[target].flat().join(', ')}`] : undefined,
        };
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { statusCode: 400, error: 'BAD_REQUEST', message: 'Datos inválidos para la consulta' };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Error interno del servidor',
    };
  }

  private fromHttpException(exception: HttpException): ResolvedError {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    const error = HttpStatus[statusCode] ?? 'ERROR';

    // multer lanza este error en ingles cuando se supera el limite de tamaño
    if (statusCode === HttpStatus.PAYLOAD_TOO_LARGE) {
      return { statusCode, error, message: 'El archivo supera el tamaño máximo permitido (2MB)' };
    }
    if (typeof response === 'string') return { statusCode, error, message: response };

    const { message } = response as { message?: string | string[] };
    // el ValidationPipe devuelve un arreglo con un mensaje por campo
    if (Array.isArray(message)) {
      return { statusCode, error, message: 'Error de validación', details: message };
    }
    return { statusCode, error, message: message ?? exception.message };
  }
}
