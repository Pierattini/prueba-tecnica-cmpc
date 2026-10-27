import { PrismaService } from '../../prisma/prisma.service';
import { makeBook } from '../../test-utils/book.fixture';
import { bookInclude } from './books.repository';
import { PrismaBooksRepository } from './prisma-books.repository';

describe('PrismaBooksRepository', () => {
  let prisma: {
    $transaction: jest.Mock;
    book: Record<'findMany' | 'count' | 'findFirst' | 'create' | 'update', jest.Mock>;
  };
  let repo: PrismaBooksRepository;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      book: {
        findMany: jest.fn().mockResolvedValue([makeBook()]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(makeBook()),
        create: jest.fn().mockResolvedValue(makeBook()),
        update: jest.fn().mockResolvedValue(makeBook()),
      },
    };
    repo = new PrismaBooksRepository(prisma as unknown as PrismaService);
  });

  describe('buildWhere', () => {
    it('excluye eliminados por defecto', () => {
      expect(repo.buildWhere({})).toEqual({ deletedAt: null });
    });

    it('solo eliminados en la papelera', () => {
      expect(repo.buildWhere({ deleted: true })).toEqual({ deletedAt: { not: null } });
    });

    it('busca por titulo o autor sin distinguir mayusculas y aplica filtros', () => {
      expect(
        repo.buildWhere({
          search: '  borges ',
          genreId: 'g',
          publisherId: 'p',
          authorId: 'a',
          available: false,
        }),
      ).toEqual({
        deletedAt: null,
        OR: [
          { title: { contains: 'borges', mode: 'insensitive' } },
          { author: { name: { contains: 'borges', mode: 'insensitive' } } },
        ],
        genreId: 'g',
        publisherId: 'p',
        authorId: 'a',
        isAvailable: false,
      });
    });

    it('ignora busquedas en blanco', () => {
      expect(repo.buildWhere({ search: '   ' })).toEqual({ deletedAt: null });
    });
  });

  it('mapea el orden a Prisma incluyendo relaciones y desempate por id', () => {
    expect(
      repo.buildOrderBy([
        { field: 'author', direction: 'asc' },
        { field: 'publisher', direction: 'desc' },
        { field: 'genre', direction: 'asc' },
        { field: 'price', direction: 'desc' },
        { field: 'title', direction: 'asc' },
        { field: 'stock', direction: 'asc' },
        { field: 'isAvailable', direction: 'desc' },
        { field: 'createdAt', direction: 'asc' },
        { field: 'updatedAt', direction: 'desc' },
      ]),
    ).toEqual([
      { author: { name: 'asc' } },
      { publisher: { name: 'desc' } },
      { genre: { name: 'asc' } },
      { price: 'desc' },
      { title: 'asc' },
      { stock: 'asc' },
      { isAvailable: 'desc' },
      { createdAt: 'asc' },
      { updatedAt: 'desc' },
      { id: 'asc' },
    ]);
  });

  it('findPage consulta items y total en una transaccion', async () => {
    const result = await repo.findPage({}, [{ field: 'price', direction: 'asc' }], 3, 5);
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5, include: bookInclude }),
    );
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('findBatch usa skip/take', async () => {
    await repo.findBatch({}, [], 500, 500);
    expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 500, take: 500 }));
  });

  it('findById filtra por estado de eliminacion y usa la transaccion si viene', async () => {
    const tx = { book: { findFirst: jest.fn().mockResolvedValue(null) } };
    await repo.findById('id', { deleted: true }, tx as never);
    expect(tx.book.findFirst).toHaveBeenCalledWith({
      where: { id: 'id', deletedAt: { not: null } },
      include: bookInclude,
    });
    await repo.findById('id');
    expect(prisma.book.findFirst).toHaveBeenCalledWith({ where: { id: 'id', deletedAt: null }, include: bookInclude });
  });

  it('create conecta o crea autor, editorial y genero por nombre', async () => {
    await repo.create({
      title: 'T',
      authorName: 'A',
      publisherName: 'P',
      genreName: 'G',
      price: 10,
      stock: 1,
      isAvailable: true,
    });
    expect(prisma.book.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        author: { connectOrCreate: { where: { name: 'A' }, create: { name: 'A' } } },
        genre: { connectOrCreate: { where: { name: 'G' }, create: { name: 'G' } } },
      }),
      include: bookInclude,
    });
  });

  it('update solo toca las relaciones que vienen', async () => {
    await repo.update('id', { stock: 2, publisherName: 'Nueva' });
    const { data } = prisma.book.update.mock.calls[0][0];
    expect(data.author).toBeUndefined();
    expect(data.genre).toBeUndefined();
    expect(data.publisher).toEqual({ connectOrCreate: { where: { name: 'Nueva' }, create: { name: 'Nueva' } } });

    prisma.book.update.mockClear();
    await repo.update('id', { authorName: 'X', genreName: 'Y' });
    const second = prisma.book.update.mock.calls[0][0].data;
    expect(second.author).toBeDefined();
    expect(second.genre).toBeDefined();
    expect(second.publisher).toBeUndefined();
  });

  it('softDelete marca deletedAt y restore lo limpia', async () => {
    await repo.softDelete('id');
    expect(prisma.book.update).toHaveBeenCalledWith({ where: { id: 'id' }, data: { deletedAt: expect.any(Date) } });
    await repo.restore('id');
    expect(prisma.book.update).toHaveBeenLastCalledWith({
      where: { id: 'id' },
      data: { deletedAt: null },
      include: bookInclude,
    });
  });
});
