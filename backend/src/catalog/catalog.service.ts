import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogItemDto } from './dto/catalog-item.dto';

export type CatalogKind = 'authors' | 'publishers' | 'genres';

const select = { id: true, name: true } as const;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  list(kind: CatalogKind, search?: string): Promise<CatalogItemDto[]> {
    const args = {
      where: search ? { name: { contains: search.trim(), mode: Prisma.QueryMode.insensitive } } : {},
      orderBy: { name: Prisma.SortOrder.asc },
      select,
    };
    switch (kind) {
      case 'authors':
        return this.prisma.author.findMany(args);
      case 'publishers':
        return this.prisma.publisher.findMany(args);
      case 'genres':
        return this.prisma.genre.findMany(args);
    }
  }

  // si el nombre ya existe Prisma lanza P2002 y el filtro global responde 409
  create(kind: CatalogKind, name: string): Promise<CatalogItemDto> {
    const args = { data: { name: name.trim() }, select };
    switch (kind) {
      case 'authors':
        return this.prisma.author.create(args);
      case 'publishers':
        return this.prisma.publisher.create(args);
      case 'genres':
        return this.prisma.genre.create(args);
    }
  }
}
