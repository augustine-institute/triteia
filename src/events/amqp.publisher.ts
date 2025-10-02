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
  SendOperationFailedError,
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
    // FIXME upgrade typescript and fix type
    //transport: process.env.AMQP_TRANSPORT as 'tcp' | 'tls' | 'ssl' | undefined,
    transport: process.env.AMQP_TRANSPORT as any,
    username: process.env.AMQP_USERNAME,
    password: process.env.AMQP_PASSWORD,
    reconnect: true,
  });
  /** Use a single session because nodejs is single-threaded. */
  private session: Session | undefined;
  /** Ensure only one session is opened at a time. */
  private pendingSession: Promise<Session> | undefined;

  /** Reuse one sender per address. */
  private readonly senders: Record<string, Promise<AwaitableSender>> = {};

  private readonly serialize: AmqpSerializer;

  constructor(private readonly appEvents: AppEvents) {
    this.connection.on(
      ConnectionEvents.connectionOpen,
      ({ connection }: EventContext) => {
        // FIXME upgrade typescript and fix type
        const { host, port } = connection.options as any;
        this.logger.log(`Connected to ${host}:${port}`);
      },
    );
    this.connection.on(
      ConnectionEvents.connectionClose,
      ({ connection }: EventContext) => {
        // FIXME upgrade typescript and fix type
        const { host, port } = connection.options as any;
        if (this.session) {
          this.logger.warn(
            `Connection to ${host}:${port} closed with open session`,
          );
          this.session.remove();
          this.session = undefined;
        } else {
          this.logger.log(`Closed connection to ${host}:${port}`);
        }
      },
    );
    this.connection.on(ConnectionEvents.error, (context: EventContext) => {
      this.logger.warn('Connection error', context.error?.stack);
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
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.debug(`Shutting down`);
    if (this.session) {
      await this.session.close();
      this.session = undefined;
    }
    await this.connection.close();
  }

  async emit({ op, document }: AppEventTypes['document']) {
    const address = `${this.targetPrefix}${document.collection}.${document.system}.${op}`;
    const sender = await this.getSender(address);

    // this seems to wait for delivery to a queue, but not for it to be received
    try {
      await sender.send(this.serialize(document), {
        timeoutInSeconds: 10,
      });
      this.logger.debug(`Event sent to ${address} for ${document.id}`);
    } catch (err) {
      if (err instanceof SendOperationFailedError && err.code === 'released') {
        this.logger.warn(
          `Event sent to ${address} for ${document.id} was released (no subscribers to topic)`,
        );
        return;
      }
      throw err;
    }
  }

  private async getOpenSession(): Promise<Session> {
    if (this.session) {
      if (this.session.isClosed()) {
        this.logger.warn('Session is unexpectedly closed; opening new session');
        this.session.remove();
        this.session = undefined;
      } else {
        return this.session;
      }
    }

    if (this.pendingSession) {
      return await this.pendingSession;
    }

    try {
      this.pendingSession = this.createSession();
      this.session = await this.pendingSession;
    } finally {
      this.pendingSession = undefined;
    }
    return this.session;
  }

  private async createSession(): Promise<Session> {
    if (!this.connection.isOpen()) {
      this.logger.debug('Reconnecting...');
      await this.connection.open();
    }
    return await this.connection.createSession();
  }

  private async getSender(address: string): Promise<AwaitableSender> {
    let sender = await this.senders[address];
    if (sender && !sender.isClosed()) {
      return sender;
    }

    const session = await this.getOpenSession();
    const senderPromise = session.createAwaitableSender({
      // name: senderName,
      target: { address },
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
