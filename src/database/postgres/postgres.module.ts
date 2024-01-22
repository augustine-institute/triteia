import { Module } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { PostgresService } from './postgres.service';

@Module({
  providers: [
    PostgresService,
    { provide: DatabaseService, useExisting: PostgresService },
  ],
  exports: [DatabaseService],
})
export class PostgresModule {}
