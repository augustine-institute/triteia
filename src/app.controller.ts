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
import { Ref, Patch } from './interfaces';
import {
  Document,
  HistoryResponse,
  ListResponse,
  DocumentInput,
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

  @Get(':collection(?!graphql)/:system?')
  async list(
    @Param('collection') collection: string,
    @Param('system') system?: string,
    @Query()
    query?: { globalId?: string; withContent?: boolean; deleted?: boolean },
  ): Promise<ListResponse> {
    const { globalId, ...options } = query ?? {};
    if (!globalId) {
      // TODO list systems or paginate all records?
      throw new BadRequestException();
    }
    return this.appService.list(collection, globalId, {
      system,
      withContent: !!system,
      ...options,
    });
  }

  @Get(':collection(?!graphql)/:system/:id')
  async load(
    @Param() ref: Ref,
    @Query() options?: { deleted?: boolean; at?: string },
  ): Promise<Document> {
    return this.appService.load(ref, options);
  }

  @Post(':collection(?!graphql)')
  async save(
    @Param('collection') collection: string,
    @Body() data: DocumentInput,
    @Query() options?: { merge?: boolean },
  ): Promise<Document> {
    return this.appService.save(collection, data, options);
  }

  /** Set the deletedAt of a record. */
  @Delete(':collection(?!graphql)/:system/:id')
  async delete(
    @Param() ref: Ref,
    @Query() options?: { deletedAt?: string },
  ): Promise<Document> {
    return this.appService.delete(ref, options);
  }

  /** Load just the content of the record instead of including cache metadata. */
  @Get(':collection(?!graphql)/:system/:id/content')
  async loadContent(
    @Param() ref: Ref,
    @Query() options?: { deleted?: boolean; at?: string },
  ): Promise<Record<string, unknown>> {
    const response = await this.appService.load(ref, options);
    return response.content;
  }

  /** Save using just the record content as the body. */
  @Put(':collection(?!graphql)/:system/:id/content')
  async saveContent(
    //@Headers() headers: Record<string, string>, // "field-globalid: sku" or automatic?
    @Param() { collection, system, id }: Ref,
    @Body() content: Record<string, unknown>,
    @Query() options?: { merge?: boolean },
  ): Promise<Patch> {
    const document = { system, id, content };
    const response = await this.appService.save(collection, document, options);
    return response.event?.changes ?? [];
  }

  /** Get the history of changes to a record. */
  @Get(':collection(?!graphql)/:system/:id/history')
  async loadHistory(@Param() ref: Ref): Promise<HistoryResponse> {
    return this.appService.loadHistory(ref);
  }

  /** List records which share this record's global id. */
  @Get(':collection(?!graphql)/:system/:id/related')
  async listRelated(
    @Param() ref: Ref,
    @Query() options?: { deleted?: boolean },
  ): Promise<ListResponse> {
    return await this.appService.listRelated(ref, options);
  }

  /** List records which share this record's global id. */
  @Get(':collection(?!graphql)/:system/:id/related/:reqSystem')
  async listRelatedInSystem(
    @Param() { reqSystem, ...ref }: Ref & { reqSystem: string },
    @Query() options?: { withContent?: boolean; deleted?: boolean },
  ): Promise<ListResponse> {
    const response = await this.appService.listRelated(ref, options);
    const documents = await Promise.all(
      response.documents.filter((doc) => doc.system === reqSystem),
    );
    return { documents };
  }
}
