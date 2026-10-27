import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { compareSync } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const dbUser = {
  id: 'u1',
  email: 'ana@cmpc.cl',
  name: 'Ana',
  role: Role.USER,
  passwordHash: 'hash',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('UsersService', () => {
  let prisma: {
    $transaction: jest.Mock;
    user: Record<'findUnique' | 'findMany' | 'count' | 'create', jest.Mock>;
  };
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([dbUser]),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn(),
      },
    };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('busca por email en minusculas', async () => {
    await service.findByEmail('ANA@CMPC.CL');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'ana@cmpc.cl' } });
  });

  it('findById nunca expone el hash', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);
    const user = await service.findById('u1');
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('findById lanza 404', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toThrow(NotFoundException);
  });

  it('lista paginado', async () => {
    const page = await service.findAll({ page: 1, limit: 10 });
    expect(page.meta.total).toBe(1);
    expect(page.items[0]).not.toHaveProperty('passwordHash');
  });

  it('crea con la contraseña hasheada y rol por defecto USER', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ ...dbUser, ...data }));

    await service.create({ email: 'ana@cmpc.cl', name: 'Ana', password: 'Clave123' });

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.role).toBe(Role.USER);
    expect(data.passwordHash).not.toBe('Clave123');
    expect(compareSync('Clave123', data.passwordHash)).toBe(true);
  });

  it('respeta el rol indicado por un admin', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(dbUser);
    await service.create({ email: 'b@cmpc.cl', name: 'B', password: 'Clave123', role: Role.ADMIN });
    expect(prisma.user.create.mock.calls[0][0].data.role).toBe(Role.ADMIN);
  });

  it('rechaza emails duplicados', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);
    await expect(service.create({ email: 'ana@cmpc.cl', name: 'A', password: 'Clave123' })).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('UsersController', () => {
  it('delega en el servicio', () => {
    const service = { findAll: jest.fn(), create: jest.fn() };
    const controller = new UsersController(service as unknown as UsersService);
    controller.findAll({ page: 1, limit: 5 });
    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 5 });
    const dto = { email: 'a@b.cl', name: 'A', password: 'Clave123' };
    controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});
