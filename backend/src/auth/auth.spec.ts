import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

const user = {
  id: 'u1',
  email: 'admin@cmpc.cl',
  name: 'Admin',
  role: Role.ADMIN,
  passwordHash: hashSync('Admin123!', 4),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('AuthService', () => {
  let users: { findByEmail: jest.Mock; create: jest.Mock; findById: jest.Mock };
  let jwt: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    users = { findByEmail: jest.fn(), create: jest.fn(), findById: jest.fn() };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    const config = { get: jest.fn().mockReturnValue(7200) };
    service = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  it('devuelve token y usuario sin el hash con credenciales validas', async () => {
    users.findByEmail.mockResolvedValue(user);

    const res = await service.login({ email: user.email, password: 'Admin123!' });

    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', email: user.email, role: Role.ADMIN });
    expect(res).toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 7200,
      user: { id: 'u1', email: user.email, name: 'Admin', role: Role.ADMIN, createdAt: user.createdAt },
    });
    expect(res.user).not.toHaveProperty('passwordHash');
  });

  it('rechaza contraseña incorrecta', async () => {
    users.findByEmail.mockResolvedValue(user);
    await expect(service.login({ email: user.email, password: 'otra' })).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza emails inexistentes con el mismo mensaje', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(service.login({ email: 'x@y.cl', password: 'a' })).rejects.toThrow('Credenciales inválidas');
  });

  it('registra siempre con rol USER', async () => {
    users.create.mockResolvedValue({ ...user, role: Role.USER });
    await service.register({ email: 'n@cmpc.cl', name: 'N', password: 'Clave123' });
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ role: Role.USER }));
  });

  it('me consulta el usuario por id', async () => {
    users.findById.mockResolvedValue('perfil');
    await expect(service.me('u1')).resolves.toBe('perfil');
  });
});

describe('AuthController', () => {
  const service = { login: jest.fn(), register: jest.fn(), me: jest.fn() };
  const controller = new AuthController(service as unknown as AuthService);

  it('delega en el servicio', () => {
    controller.login({ email: 'a@b.cl', password: 'x' });
    expect(service.login).toHaveBeenCalledWith({ email: 'a@b.cl', password: 'x' });
    controller.register({ email: 'a@b.cl', password: 'Clave123', name: 'A' });
    expect(service.register).toHaveBeenCalled();
    controller.me({ id: 'u1', email: 'a@b.cl', role: Role.USER });
    expect(service.me).toHaveBeenCalledWith('u1');
  });
});

describe('JwtStrategy', () => {
  it('transforma el payload en el usuario del request', () => {
    const config = { getOrThrow: jest.fn().mockReturnValue('s'.repeat(32)) };
    const strategy = new JwtStrategy(config as unknown as ConfigService);
    expect(strategy.validate({ sub: 'u1', email: 'a@b.cl', role: Role.USER })).toEqual({
      id: 'u1',
      email: 'a@b.cl',
      role: Role.USER,
    });
  });
});
