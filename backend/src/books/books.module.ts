import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { BooksRepository } from './repositories/books.repository';
import { PrismaBooksRepository } from './repositories/prisma-books.repository';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [BooksController],
  providers: [BooksService, { provide: BooksRepository, useClass: PrismaBooksRepository }],
})
export class BooksModule {}
