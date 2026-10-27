import { PrismaService } from '../prisma/prisma.service';
import { CatalogController } from './catalog.controller';
import { CatalogKind, CatalogService } from './catalog.service';

describe('CatalogService', () => {
  const delegate = () => ({ findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({}) });
  const prisma = { author: delegate(), publisher: delegate(), genre: delegate() };
  const service = new CatalogService(prisma as unknown as PrismaService);

  it.each<[CatalogKind, keyof typeof prisma]>([
    ['authors', 'author'],
    ['publishers', 'publisher'],
    ['genres', 'genre'],
  ])('lista y crea %s', async (kind, model) => {
    await service.list(kind);
    expect(prisma[model].findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    await service.create(kind, '  Nuevo  ');
    expect(prisma[model].create).toHaveBeenCalledWith({
      data: { name: 'Nuevo' },
      select: { id: true, name: true },
    });
  });

  it('filtra por nombre sin distinguir mayusculas', async () => {
    await service.list('authors', ' borges ');
    expect(prisma.author.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { name: { contains: 'borges', mode: 'insensitive' } } }),
    );
  });
});

describe('CatalogController', () => {
  const service = { list: jest.fn(), create: jest.fn() };
  const controller = new CatalogController(service as unknown as CatalogService);

  it('mapea cada ruta a su catalogo', () => {
    controller.listAuthors({ search: 'a' });
    controller.listPublishers({});
    controller.listGenres({});
    expect(service.list.mock.calls).toEqual([
      ['authors', 'a'],
      ['publishers', undefined],
      ['genres', undefined],
    ]);

    controller.createAuthor({ name: 'A' });
    controller.createPublisher({ name: 'P' });
    controller.createGenre({ name: 'G' });
    expect(service.create.mock.calls).toEqual([
      ['authors', 'A'],
      ['publishers', 'P'],
      ['genres', 'G'],
    ]);
  });
});
