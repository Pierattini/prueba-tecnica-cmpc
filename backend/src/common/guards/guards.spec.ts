import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { httpContext } from '../../test-utils/http-context';
import { extractAuditContext } from '../decorators/audit-context.decorator';
import { extractCurrentUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector & {
    getAllAndOverride: jest.Mock;
  };
  const guard = new RolesGuard(reflector);

  it('deja pasar si la ruta no exige roles', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(httpContext())).toBe(true);
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(httpContext())).toBe(true);
  });

  it('permite al rol requerido', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(httpContext({ user: { role: Role.ADMIN } }))).toBe(true);
  });

  it('rechaza otros roles o usuarios ausentes', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(() => guard.canActivate(httpContext({ user: { role: Role.USER } }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(httpContext({}))).toThrow(ForbiddenException);
  });
});

describe('JwtAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector & {
    getAllAndOverride: jest.Mock;
  };
  const guard = new JwtAuthGuard(reflector);

  it('no valida token en rutas @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(guard.canActivate(httpContext())).toBe(true);
  });

  it('delega en passport en rutas protegidas', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const parent = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
    expect(guard.canActivate(httpContext())).toBe(true);
    expect(parent).toHaveBeenCalled();
    parent.mockRestore();
  });

  it('devuelve el usuario valido y lanza 401 en espanol si falta', () => {
    const user = { id: '1' };
    expect(guard.handleRequest(null, user)).toBe(user);
    expect(() => guard.handleRequest(null, false)).toThrow(UnauthorizedException);
    expect(() => guard.handleRequest(new Error('jwt expired'), user)).toThrow(/Token inválido/);
  });
});

describe('decoradores de parametros', () => {
  it('CurrentUser devuelve req.user', () => {
    const user = { id: 'u1', email: 'a@b.cl', role: Role.USER };
    expect(extractCurrentUser(undefined, httpContext({ user }))).toBe(user);
  });

  it('AuditCtx arma userId e ip desde el request', () => {
    const ctx = httpContext({ user: { id: 'u1' }, headers: {}, ip: '10.0.0.1' });
    expect(extractAuditContext(undefined, ctx)).toEqual({ userId: 'u1', ip: '10.0.0.1' });
  });

  it('AuditCtx funciona sin usuario autenticado', () => {
    const ctx = httpContext({ headers: {}, ip: '10.0.0.1' });
    expect(extractAuditContext(undefined, ctx)).toEqual({ userId: undefined, ip: '10.0.0.1' });
  });
});
