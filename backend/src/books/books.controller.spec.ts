import { BooksController } from './books.controller';
import { BooksService } from './books.service';

describe('BooksController', () => {
  const service = {
    findAll: jest.fn().mockResolvedValue('page'),
    findOne: jest.fn().mockResolvedValue('book'),
    exportCsv: jest.fn().mockReturnValue('file'),
    create: jest.fn().mockResolvedValue('created'),
    update: jest.fn().mockResolvedValue('updated'),
    remove: jest.fn().mockResolvedValue(undefined),
    restore: jest.fn().mockResolvedValue('restored'),
    uploadImage: jest.fn().mockResolvedValue('withImage'),
  };
  const controller = new BooksController(service as unknown as BooksService);
  const ctx = { userId: 'u', ip: '1.1.1.1' };
  const query = { page: 1, limit: 10 };

  it('delega listado, papelera, detalle y export en el servicio', async () => {
    await expect(controller.findAll(query)).resolves.toBe('page');
    expect(service.findAll).toHaveBeenCalledWith(query);
    await expect(controller.findDeleted(query)).resolves.toBe('page');
    expect(service.findAll).toHaveBeenLastCalledWith(query, true);
    await expect(controller.findOne('id')).resolves.toBe('book');
    expect(controller.export({ search: 'x' })).toBe('file');
  });

  it('pasa el contexto de auditoria en las escrituras', async () => {
    const dto = { title: 't', author: 'a', publisher: 'p', genre: 'g', price: 1, stock: 1 };
    await controller.create(dto, ctx);
    expect(service.create).toHaveBeenCalledWith(dto, ctx);
    await controller.update('id', { stock: 2 }, ctx);
    expect(service.update).toHaveBeenCalledWith('id', { stock: 2 }, ctx);
    await controller.remove('id', ctx);
    expect(service.remove).toHaveBeenCalledWith('id', ctx);
    await controller.restore('id', ctx);
    expect(service.restore).toHaveBeenCalledWith('id', ctx);
  });

  it('entrega el archivo subido al servicio', async () => {
    const file = { buffer: Buffer.from('x'), mimetype: 'image/png', size: 1 } as Express.Multer.File;
    await expect(controller.uploadImage('id', file, ctx)).resolves.toBe('withImage');
    expect(service.uploadImage).toHaveBeenCalledWith('id', file, ctx);
  });
});
