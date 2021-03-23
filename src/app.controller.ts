import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Ip,
  Logger,
  Post,
  Put,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
} from '@nestjs/terminus';
import { AppHealthIndicator } from './app.health';
import { AppService } from './app.service';
import { Ref, HistoryOptions, ListOptions, Patch } from './interfaces';
import {
  Collection,
  CollectionInput,
  Document,
  DocumentInput,
  HistoryResponse,
  ListResponse,
  Event,
} from './schema';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly healthCheckService: HealthCheckService,
    private readonly appHealthIndicator: AppHealthIndicator,
  ) {}

  @Get()
  root(@Ip() ip = '') {
    this.logger.debug(`GET "/" requested from "${ip}"`);
    // TODO should we use hateoas, json+hal?
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

  @Get('collections/:collection/:system?')
  async list(
    @Param('collection') collection: string,
    @Param('system') system?: string,
    @Query()
    query?: { globalId?: string } & ListOptions,
  ): Promise<ListResponse> {
    const { globalId, withContent, ...options } = query ?? {};
    if (!globalId) {
      // TODO list systems or paginate all records?
      throw new BadRequestException();
    }
    return this.appService.list(collection, globalId, {
      system,
      withContent: withContent ?? !!system,
      ...options,
    });
  }

  @Get('collections/:collection/:system/:id')
  async load(
    @Param() ref: Ref,
    @Query() options?: { deleted?: boolean; at?: string },
  ): Promise<Document> {
    return this.appService.load(ref, options);
  }

  @Post('collections')
  async initialize(@Body() data: CollectionInput): Promise<Collection> {
    if (!data?.id) {
      throw new BadRequestException();
    }
    return this.appService.initialize(data);
  }

  @Post('collections/:collection')
  async save(
    @Param('collection') collection: string,
    @Body() data: DocumentInput,
    @Query() options?: { merge?: boolean },
  ): Promise<Document> {
    const ref = { collection, system: data.system, id: data.id };
    return this.appService.save(ref, data, options);
  }

  /** Set the deletedAt of a record. */
  @Delete('collections/:collection/:system/:id')
  async delete(
    @Param() ref: Ref,
    @Query() options?: { deletedAt?: string },
  ): Promise<Document> {
    return this.appService.delete(ref, options);
  }

  /** Load just the content of the record instead of including cache metadata. */
  @Get('collections/:collection/:system/:id/content')
  async loadContent(
    @Param() ref: Ref,
    @Query() options?: { deleted?: boolean; at?: string },
  ): Promise<Record<string, unknown>> {
    const response = await this.appService.load(ref, options);
    return response.content;
  }

  /** Save using just the record content as the body. */
  @Put('collections/:collection/:system/:id/content')
  async saveContent(
    //@Headers() headers: Record<string, string>, // "field-globalid: sku" or automatic?
    @Param() ref: Ref,
    @Body() content: Record<string, unknown>,
    @Query() options?: { merge?: boolean },
  ): Promise<Patch> {
    const document = { system: ref.system, id: ref.id, content };
    const response = await this.appService.save(ref, document, options);
    return response.event?.changes ?? [];
  }

  /** List records which share this record's global id. */
  @Get('collections/:collection/:system/:id/related/:reqSystem?')
  async listRelated(
    @Param() { reqSystem, ...ref }: Ref & { reqSystem: string },
    @Query() options?: { withContent?: boolean; deleted?: boolean },
  ): Promise<Document[]> {
    const response = await this.appService.listRelated(ref, {
      ...options,
      ...(reqSystem && { system: reqSystem }),
      withContent: options?.withContent ?? !!reqSystem,
    });
    return response.documents;
  }

  /** Get the recent history of changes to a record. */
  @Get('collections/:collection/:system/:id/events')
  async loadEvents(@Param() ref: Ref): Promise<Event[]> {
    const { events } = await this.appService.loadHistory(ref);
    return events;
  }

  /** Get the full history of changes to a record. */
  @Get('history/:collection/:system/:id')
  async loadHistory(
    @Param() ref: Ref,
    @Query() options?: HistoryOptions,
  ): Promise<HistoryResponse> {
    return await this.appService.loadHistory(ref, options);
  }
}
