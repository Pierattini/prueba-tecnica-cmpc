import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('responde ok si la BD contesta', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([1]) };
    const res = await new HealthController(prisma as unknown as PrismaService).check();
    expect(res).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('responde 503 si la BD no esta disponible', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('down')) };
    await expect(new HealthController(prisma as unknown as PrismaService).check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

describe('PrismaService', () => {
  it('conecta al iniciar y desconecta al cerrar', async () => {
    const config = { getOrThrow: jest.fn().mockReturnValue('postgresql://u:p@localhost:5432/db') };
    const service = new PrismaService(config as unknown as ConfigService);
    expect(config.getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
    const connect = jest.spyOn(service, '$connect').mockResolvedValue();
    const disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue();
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(connect).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });
});
