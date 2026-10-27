import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

function prismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: 'test', meta });
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', url: '/api/books' }),
      }),
    } as unknown as ArgumentsHost;
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('responde con formato uniforme', () => {
    filter.catch(new ForbiddenException('No puedes'), host);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        error: 'FORBIDDEN',
        message: 'No puedes',
        path: '/api/books',
        timestamp: expect.any(String),
      }),
    );
  });

  it('expone los errores del ValidationPipe como details', () => {
    const res = filter.resolve(new BadRequestException(['title should not be empty', 'price must be a number']));
    expect(res).toEqual({
      statusCode: 400,
      error: 'BAD_REQUEST',
      message: 'Error de validación',
      details: ['title should not be empty', 'price must be a number'],
    });
  });

  it('acepta HttpException con respuesta string', () => {
    expect(filter.resolve(new HttpException('texto', 418))).toMatchObject({ statusCode: 418, message: 'texto' });
  });

  it('usa el mensaje de la excepcion si la respuesta no trae message', () => {
    expect(filter.resolve(new HttpException({ foo: 1 }, 400))).toMatchObject({ message: 'Http Exception' });
  });

  it('traduce el error de tamaño de multer', () => {
    expect(filter.resolve(new PayloadTooLargeException('File too large'))).toMatchObject({
      statusCode: 413,
      message: expect.stringContaining('2MB'),
    });
  });

  it.each([
    ['P2002', 409],
    ['P2025', 404],
    ['P2003', 400],
  ])('traduce el error %s de Prisma a %d', (code, expected) => {
    expect(filter.resolve(prismaError(code)).statusCode).toBe(expected);
  });

  it('incluye el campo en conflicto cuando Prisma lo informa', () => {
    expect(filter.resolve(prismaError('P2002', { target: ['email'] })).details).toEqual(['campo: email']);
    expect(filter.resolve(prismaError('P2002', { target: 'name' })).details).toEqual(['campo: name']);
  });

  it('responde 500 para codigos de Prisma no mapeados', () => {
    expect(filter.resolve(prismaError('P1001')).statusCode).toBe(500);
  });

  it('responde 400 ante errores de validacion de Prisma', () => {
    const err = new Prisma.PrismaClientValidationError('bad', { clientVersion: 'test' });
    expect(filter.resolve(err).statusCode).toBe(400);
  });

  it('oculta el detalle de errores desconocidos y los loguea', () => {
    filter.catch(new Error('secreto interno'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error interno del servidor' }));
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('loguea tambien excepciones que no son Error', () => {
    filter.catch('string lanzado', host);
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.any(String), 'string lanzado');
  });
});
