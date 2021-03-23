import { Module } from '@nestjs/common';
import { MariadbService } from './mariadb.service';

@Module({
  providers: [MariadbService],
  exports: [MariadbService],
})
export class MariadbModule {}
