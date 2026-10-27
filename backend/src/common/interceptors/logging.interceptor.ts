import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AuthUser } from '../types/auth-user.types';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const startedAt = Date.now();
    // el guard JWT corre antes que los interceptores, asi que req.user ya esta disponible
    const user = (req.user as AuthUser | undefined)?.email ?? 'anonimo';
    const describe = (status: number) =>
      `${req.method} ${req.originalUrl ?? req.url} ${status} - ${user} - ${Date.now() - startedAt}ms`;

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(describe(res.statusCode)),
        error: (err: unknown) => {
          const status = err instanceof HttpException ? err.getStatus() : 500;
          this.logger.warn(describe(status));
        },
      }),
    );
  }
}
