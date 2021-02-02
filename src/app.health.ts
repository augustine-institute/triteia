import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class AppHealthIndicator extends HealthIndicator {
  async isHealthy(): Promise<HealthIndicatorResult> {
    const isHealthy = true;
    return this.getStatus('app', isHealthy, {});
  }
}
