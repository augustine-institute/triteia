import { Module } from '@nestjs/common';
import { AppEvents } from './app.events';
import { AmqpPublisher } from './amqp.publisher';
import { LogPublisher } from './log.publisher';

@Module({
  providers: [
    AppEvents,
    ...(process.env.AMQP_HOST ? [AmqpPublisher] : []),
    ...(process.env.LOG_EVENTS ? [LogPublisher] : []),
  ],
  exports: [AppEvents],
})
export class EventsModule {}
