import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let root: string;
  let storage: LocalStorageService;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cmpc-uploads-'));
    storage = new LocalStorageService({ get: () => root } as unknown as ConfigService);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('guarda con nombre aleatorio y devuelve la url publica', async () => {
    const stored = await storage.save(
      { buffer: Buffer.from('img'), extension: 'png', contentType: 'image/png' },
      'books',
    );
    expect(stored.url).toMatch(/^\/uploads\/books\/[0-9a-f-]{36}\.png$/);
    expect(readFileSync(join(root, stored.key)).toString()).toBe('img');
    expect(storage.getRoot()).toBe(root);
  });

  it('borra archivos existentes', async () => {
    const stored = await storage.save({ buffer: Buffer.from('x'), extension: 'jpg', contentType: 'image/jpeg' }, 'books');
    await storage.delete(stored.url);
    expect(existsSync(join(root, stored.key))).toBe(false);
  });

  it('ignora urls ajenas o incompletas', async () => {
    await expect(storage.delete('https://otro.cl/a.png')).resolves.toBeUndefined();
    await expect(storage.delete('/uploads/solo')).resolves.toBeUndefined();
  });

  it('no permite salir de la carpeta con path traversal', async () => {
    await storage.delete('/uploads/../../etc/passwd');
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.not.stringContaining('etc'));
  });

  it('solo advierte si el archivo ya no existe', async () => {
    await expect(storage.delete('/uploads/books/no-existe.png')).resolves.toBeUndefined();
    expect(Logger.prototype.warn).toHaveBeenCalled();
  });
});
