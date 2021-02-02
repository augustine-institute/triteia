import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppHealthIndicator } from './app.health';

@Module({
  imports: [TerminusModule],
  controllers: [AppController],
  providers: [AppService, AppHealthIndicator],
})
export class AppModule {}
