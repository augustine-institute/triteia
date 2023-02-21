import { Module } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { MockdbService } from './mockdb.service';

@Module({
  providers: [
    MockdbService,
    { provide: DatabaseService, useExisting: MockdbService },
  ],
  exports: [DatabaseService],
})
export class MockdbModule {}
