import { Module } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { MariadbService } from './mariadb.service';

@Module({
  providers: [
    MariadbService,
    { provide: DatabaseService, useExisting: MariadbService },
  ],
  exports: [DatabaseService],
})
export class MariadbModule {}
