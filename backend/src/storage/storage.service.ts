export interface StoredFile {
  key: string;
  url: string;
}

export interface FileToStore {
  buffer: Buffer;
  extension: string;
  contentType: string;
}

// contrato para cambiar el almacenamiento (local, S3, etc.) sin tocar los servicios de dominio
export abstract class StorageService {
  abstract save(file: FileToStore, folder: string): Promise<StoredFile>;
  abstract delete(url: string): Promise<void>;
}
