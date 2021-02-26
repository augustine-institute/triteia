import { Module } from '@nestjs/common';
import { MockdbService } from './mockdb.service';

@Module({
  providers: [MockdbService],
  exports: [MockdbService],
})
export class MockdbModule {}
