import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  const prisma = {
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    auditLog: { findMany: jest.fn().mockResolvedValue([{ id: 'l1' }]), count: jest.fn().mockResolvedValue(1) },
  };
  const service = new AuditService(prisma as unknown as PrismaService);

  it('escribe usando el cliente de la transaccion recibida', async () => {
    const tx = { auditLog: { create: jest.fn() } };
    await service.record(tx as never, { userId: 'u1', ip: '1.1.1.1' }, {
      action: AuditAction.UPDATE,
      entity: 'Book',
      entityId: 'b1',
      changes: { stock: { from: 1, to: 2 } },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: AuditAction.UPDATE,
        entity: 'Book',
        entityId: 'b1',
        changes: { stock: { from: 1, to: 2 } },
        userId: 'u1',
        ip: '1.1.1.1',
      },
    });
  });

  it('lista con filtros, paginado y mas recientes primero', async () => {
    const page = await service.findMany({ page: 2, limit: 5, entity: 'Book', action: AuditAction.DELETE });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entity: 'Book', action: AuditAction.DELETE }),
        orderBy: { createdAt: 'desc' },
        skip: 5,
        take: 5,
      }),
    );
    expect(page.meta.total).toBe(1);
  });
});

describe('AuditController', () => {
  it('delega en el servicio', () => {
    const service = { findMany: jest.fn() };
    new AuditController(service as unknown as AuditService).findMany({ page: 1, limit: 10 });
    expect(service.findMany).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });
});
