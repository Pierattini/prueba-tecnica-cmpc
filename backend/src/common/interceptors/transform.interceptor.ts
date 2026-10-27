import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Paginated, PaginationMeta } from '../utils/paginated';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<unknown> | StreamableFile> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<unknown> | StreamableFile> {
    return next.handle().pipe(
      map((body) => {
        // los archivos (export CSV) se envian tal cual
        if (body instanceof StreamableFile) return body;
        if (body instanceof Paginated) {
          return { success: true as const, data: body.items, meta: body.meta };
        }
        return { success: true as const, data: body ?? null };
      }),
    );
  }
}
