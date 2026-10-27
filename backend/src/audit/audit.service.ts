import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { Paginated } from '../common/utils/paginated';
import { PrismaService, PrismaTx } from '../prisma/prisma.service';
import { QueryAuditDto } from './dto/query-audit.dto';

export interface AuditContext {
  userId?: string;
  ip?: string;
}

export interface AuditEntry {
  action: AuditAction;
  entity: string;
  entityId: string;
  changes?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // recibe el cliente de la transaccion para que el log quede atomico con la operacion
  async record(tx: PrismaTx, ctx: AuditContext, entry: AuditEntry): Promise<void> {
    await tx.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        changes: entry.changes,
        userId: ctx.userId,
        ip: ctx.ip,
      },
    });
  }

  async findMany(query: QueryAuditDto) {
    const where: Prisma.AuditLogWhereInput = {
      entity: query.entity,
      entityId: query.entityId,
      action: query.action,
      userId: query.userId,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return Paginated.of(items, total, query.page, query.limit);
  }
}
