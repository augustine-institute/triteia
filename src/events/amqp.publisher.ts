import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Connection,
  ConnectionEvents,
  EventContext,
  Message,
  message,
  Session,
  AwaitableSender,
} from 'rhea-promise';
import { hostname } from 'os';
import { AppEvents, AppEventTypes } from './app.events';

type AmqpSerializer = (body: unknown) => Message;

/** Publishes significant events to an AMQP 1.0 compatible broker. */
@Injectable()
export class AmqpPublisher implements OnModuleInit, OnModuleDestroy {
  readonly targetPrefix = process.env.AMQP_TARGET_PREFIX || '/topic/triteia.';
  readonly messageType = process.env.AMQP_MESSAGE_TYPE || 'json';
  /**
   * Close senders after a certain amount of time in seconds.
   *
   * There should be a small number of collections and systems,
   * so they can be safely reused with very little resource usage until shutdown.
   **/
  readonly senderLifetime = process.env.AMQP_SENDER_LIFETIME
    ? Number(process.env.AMQP_SENDER_LIFETIME)
    : undefined;

  private readonly logger = new Logger(AmqpPublisher.name);

  private readonly connection: Connection = new Connection({
    container_id: hostname(),
    host: process.env.AMQP_HOST,
    port: process.env.AMQP_PORT ? Number(process.env.AMQP_PORT) : 5671,
    transport: process.env.AMQP_TRANSPORT as 'tcp' | 'tls' | 'ssl' | undefined,
    username: process.env.AMQP_USERNAME,
    password: process.env.AMQP_PASSWORD,
    reconnect: true,
  });
  /** Use a single session because nodejs is single-threaded. */
  private session: Session | undefined;
  /** Reuse one sender per address. */
  private readonly senders: Record<string, Promise<AwaitableSender>> = {};

  private readonly serialize: AmqpSerializer;

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

    if (this.messageType in amqpSerializers) {
      this.serialize = amqpSerializers[this.messageType];
    } else {
      const supported = Object.keys(amqpSerializers).join(', ');
      throw new Error(`Invalid AMQP_MESSAGE_TYPE; supported: ${supported}`);
    }
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.connection.open(),
      this.appEvents.on('document', async (event) => this.emit(event)),
    ]);
    this.session = await this.connection.createSession();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.session && !this.session.isClosed()) {
      await this.session.close();
    }
    await this.connection.close();
  }

  async emit({ op, document }: AppEventTypes['document']) {
    const address = `${this.targetPrefix}${document.collection}.${document.system}.${op}`;
    const sender = await this.getSender(address);

    // this seems to wait for delivery to a queue, but not for it to be received
    await sender.send({
      // message_id: '12343434343434',
      ...this.serialize(document),
    });
    this.logger.debug(`Event sent to ${address} for ${document.id}`);
  }

  private async getSender(address: string): Promise<AwaitableSender> {
    let sender = await this.senders[address];
    if (sender && !sender.isClosed()) {
      return sender;
    }

    if (!this.session) {
      throw new Error('AMQP session not initialized');
    } else if (this.session.isClosed()) {
      this.logger.warn('AMQP session closed; opening new session');
      this.session = await this.connection.createSession();
    }

    const senderPromise = this.session.createAwaitableSender({
      // name: senderName,
      target: { address },
      sendTimeoutInSeconds: 10,
    });
    this.senders[address] = senderPromise;
    sender = await senderPromise;
    this.logger.debug(`Sender created: ${sender.name} for ${address}`);

    if (this.senderLifetime) {
      setTimeout(() => this.closeSender(sender), 1000 * this.senderLifetime);
    }

    return sender;
  }

  private async closeSender(sender: AwaitableSender): Promise<void> {
    const address = sender.target?.address || sender.address;
    delete this.senders[address];
    await sender.close({ closeSession: false });
    this.logger.debug(`Sender closed: ${sender.name} for ${address}`);
  }
}

const amqpSerializers: Record<string, AmqpSerializer> = {
  /** JSON encoded amqp-data body, (compatible with RabbitMQ's AMQP 0-9-1). */
  json(body) {
    return {
      content_type: 'application/json; charset=utf-8',
      body: message.data_section(Buffer.from(JSON.stringify(body), 'utf8')),
    };
  },

  /** Uses the AMQP 1.0 standard types with an amqp-value body. */
  amqp(body) {
    return { body };
  },
};
