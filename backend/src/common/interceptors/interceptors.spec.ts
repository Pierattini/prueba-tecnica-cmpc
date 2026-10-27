import { CallHandler, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { httpContext } from '../../test-utils/http-context';
import { Paginated } from '../utils/paginated';
import { LoggingInterceptor } from './logging.interceptor';
import { TransformInterceptor } from './transform.interceptor';

const handler = (value: unknown): CallHandler => ({ handle: () => of(value) });

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();
  const run = (value: unknown) => lastValueFrom(interceptor.intercept(httpContext(), handler(value)));

  it('envuelve la respuesta en success/data', async () => {
    await expect(run({ id: 1 })).resolves.toEqual({ success: true, data: { id: 1 } });
  });

  it('separa items y meta de un resultado paginado', async () => {
    const page = Paginated.of(['a'], 1, 1, 10);
    await expect(run(page)).resolves.toEqual({ success: true, data: ['a'], meta: page.meta });
  });

  it('usa null cuando el handler no devuelve nada', async () => {
    await expect(run(undefined)).resolves.toEqual({ success: true, data: null });
  });

  it('no toca los archivos', async () => {
    const file = new StreamableFile(Buffer.from('x'));
    await expect(run(file)).resolves.toBe(file);
  });
});

describe('LoggingInterceptor', () => {
  const interceptor = new LoggingInterceptor();
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('registra metodo, ruta, status y usuario', async () => {
    const ctx = httpContext(
      { method: 'GET', originalUrl: '/api/books', user: { email: 'admin@cmpc.cl' } },
      { statusCode: 200 },
    );
    await lastValueFrom(interceptor.intercept(ctx, handler('ok')));
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/api\/books 200 - admin@cmpc\.cl - \d+ms$/));
  });

  it('registra errores con su status y usuario anonimo', async () => {
    const ctx = httpContext({ method: 'GET', url: '/api/x' }, { statusCode: 200 });
    const failing: CallHandler = { handle: () => throwError(() => new NotFoundException()) };
    await expect(lastValueFrom(interceptor.intercept(ctx, failing))).rejects.toThrow(NotFoundException);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('GET /api/x 404 - anonimo'));
  });

  it('usa 500 para errores no HTTP', async () => {
    const ctx = httpContext({ method: 'POST', url: '/api/y' }, {});
    const failing: CallHandler = { handle: () => throwError(() => new Error('boom')) };
    await expect(lastValueFrom(interceptor.intercept(ctx, failing))).rejects.toThrow('boom');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('POST /api/y 500'));
  });

  it('ignora contextos que no son http', async () => {
    const ctx = httpContext({}, {}, 'rpc');
    await expect(lastValueFrom(interceptor.intercept(ctx, handler('x')))).resolves.toBe('x');
    expect(log).not.toHaveBeenCalled();
  });
});
