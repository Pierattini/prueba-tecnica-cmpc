import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { FileToStore, StorageService, StoredFile } from './storage.service';

export const PUBLIC_UPLOADS_PREFIX = '/uploads';

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    super();
    this.root = resolve(config.get<string>('UPLOAD_DIR', 'uploads'));
  }

  async save(file: FileToStore, folder: string): Promise<StoredFile> {
    const dir = join(this.root, folder);
    await mkdir(dir, { recursive: true });
    // nombre aleatorio para no confiar en el nombre original del cliente
    const filename = `${randomUUID()}.${file.extension}`;
    await writeFile(join(dir, filename), file.buffer);
    const key = `${folder}/${filename}`;
    return { key, url: `${PUBLIC_UPLOADS_PREFIX}/${key}` };
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith(`${PUBLIC_UPLOADS_PREFIX}/`)) return;
    const [folder, file] = url.slice(PUBLIC_UPLOADS_PREFIX.length + 1).split('/');
    if (!folder || !file) return;
    // basename evita path traversal con urls manipuladas
    const path = join(this.root, basename(folder), basename(file));
    try {
      await unlink(path);
    } catch (err) {
      this.logger.warn(`No se pudo borrar ${path}: ${(err as Error).message}`);
    }
  }

  getRoot(): string {
    return this.root;
  }
}
