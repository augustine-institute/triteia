import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { AppHealthIndicator } from './app.health';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthCheckService: HealthCheckService,
    private readonly appHealthIndicator: AppHealthIndicator,
  ) {}

  @Get()
  root() {
    return this.appService.getHello();
  }

  /** Used for health checks and causes shutdown. */
  @Get('health')
  @HealthCheck()
  async healthCheck(): Promise<HealthCheckResult> {
    // check only if we're responding to requests
    return this.healthCheckService.check([
      async () => this.appHealthIndicator.isHealthy(),
    ]);
  }
}
