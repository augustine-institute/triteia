import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppEvents, AppEventTypes } from './app.events';

/** Publishes significant events using the nest logger. */
@Injectable()
export class LogPublisher implements OnModuleInit {
  private readonly logger = new Logger(LogPublisher.name);

  private readonly level = process.env.LOG_EVENTS;

  constructor(private readonly appEvents: AppEvents) {}

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.appEvents.on('document', async (event) => this.emit(event)),
    ]);
  }

  async emit({ op, document }: AppEventTypes['document']) {
    const { content, event, ...meta } = document;
    if (this.level === 'full') {
      this.logger.log(JSON.stringify({ op, ...document }));
    } else if (this.level === 'event') {
      this.logger.log(JSON.stringify({ op, event, ...meta }));
    } else if (this.level === 'meta') {
      this.logger.log(JSON.stringify({ op, ...meta }));
    } else {
      this.logger.log(JSON.stringify({ op, uri: meta.uri }));
    }
  }
}
