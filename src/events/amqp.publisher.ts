import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Connection, ConnectionEvents, EventContext } from 'rhea-promise';
import { hostname } from 'os';
import { AppEvents, AppEventTypes } from './app.events';

/** Publishes significant events to an AMQP 1.0 compatible broker. */
@Injectable()
export class AmqpPublisher implements OnModuleInit, OnModuleDestroy {
  readonly targetPrefix = process.env.AMQP_TARGET_PREFIX || '/topic/triteia.';

  private readonly logger = new Logger(AmqpPublisher.name);

  private readonly connection: Connection = new Connection({
    container_id: hostname(),
    host: process.env.AMQP_HOST,
    port: process.env.AMQP_PORT ? parseInt(process.env.AMQP_PORT) : 5671,
    transport: process.env.AMQP_TRANSPORT as 'tcp' | 'tls' | 'ssl' | undefined,
    username: process.env.AMQP_USERNAME,
    password: process.env.AMQP_PASSWORD,
    reconnect: true,
  });

  constructor(private readonly appEvents: AppEvents) {
    this.connection.on(
      ConnectionEvents.connectionOpen,
      ({ connection }: EventContext) => {
        const { host, port } = connection.options;
        this.logger.debug(`Connected to ${host}:${port}`);
      },
    );
    this.connection.on(
      ConnectionEvents.connectionClose,
      ({ connection }: EventContext) => {
        const { host, port } = connection.options;
        this.logger.debug(`Closed connection to ${host}:${port}`);
      },
    );
    this.connection.on(ConnectionEvents.error, (context: EventContext) => {
      this.logger.warn(context.error);
    });
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.connection.open(),
      this.appEvents.on('document', async (event) => this.emit(event)),
    ]);
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection.close();
  }

  async emit({ op, document }: AppEventTypes['document']) {
    const address = `${this.targetPrefix}${document.collection}.${document.system}.${op}`;
    const sender = await this.connection.createAwaitableSender({
      // name: senderName,
      target: { address },
      sendTimeoutInSeconds: 10,
    });

    // this seems to wait for delivery to a queue, but not for it to be received
    await sender.send({
      // message_id: '12343434343434',
      body: document,
    });
    this.logger.debug(`Event sent to ${address} for ${document.id}`);

    await sender.close();
  }
}
