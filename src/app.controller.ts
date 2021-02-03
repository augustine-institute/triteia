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
import {
  Rec,
  Ref,
  History,
  SaveResponse,
  SaveRequest,
  Patch,
} from './interfaces';

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

  @Get(':collection')
  async listAll(
    @Param('collection') collection: string,
    @Query() { globalId, ...options }: { globalId: string; deleted?: boolean },
  ): Promise<Ref[]> {
    if (!globalId) {
      // TODO list systems or paginate all records?
      throw new BadRequestException();
    }
    return this.appService.lookup(collection, globalId, options);
  }

  @Get(':collection/:system')
  async list(
    @Param('collection') collection: string,
    @Param('system') system: string,
    @Query()
    {
      globalId,
      ...options
    }: { globalId: string; deleted?: boolean; at?: string },
  ): Promise<Rec[]> {
    if (!globalId) {
      // TODO search?
      throw new BadRequestException();
    }
    return this.appService.loadByGlobalId(
      collection,
      globalId,
      system,
      options,
    );
  }

  @Get(':collection/:system/:id')
  async load(
    @Param('collection') collection: string,
    @Param('system') system: string,
    @Param('id') id: string,
    @Query() options?: { deleted?: boolean; at?: string },
  ): Promise<Rec> {
    return this.appService.load(collection, system, id, options);
  }

  @Post(':collection/:system')
  async save(
    @Param('collection') collection: string,
    @Param('system') system: string,
    @Body() data: SaveRequest,
    @Query() options?: { merge?: boolean },
  ): Promise<SaveResponse> {
    return this.appService.save(collection, system, data, options);
  }

  /** Set the deletedAt of a record. */
  @Delete(':collection/:system/:id')
  async delete(
    @Param('collection') collection: string,
    @Param('system') system: string,
    @Param('id') id: string,
    @Query() options?: { deletedAt?: string },
  ): Promise<Rec> {
    return this.appService.delete(collection, system, id, options);
  }

  /** Load just the content of the record instead of including cache metadata. */
  @Get(':collection/:system/:id/content')
  async loadContent(
    @Param('collection') collection: string,
    @Param('system') system: string,
    @Param('id') id: string,
    @Query() options?: { deleted?: boolean; at?: string },
  ): Promise<Record<string, unknown>> {
    const response = await this.appService.load(
      collection,
      system,
      id,
      options,
    );
    return response.content;
  }

  /** Save using just the record content as the body. */
  @Put(':collection/:system/:id/content')
  async saveContent(
    //@Headers() headers: Record<string, string>, // "field-globalid: sku" or automatic?
    @Param('collection') collection: string,
    @Param('system') system: string,
    @Param('id') id: string,
    @Body() content: Record<string, unknown>,
    @Query() options?: { merge?: boolean },
  ): Promise<Patch> {
    const record = { id, content };
    const response = await this.appService.save(
      collection,
      system,
      record,
      options,
    );
    return response.changes;
  }

  /** Get the history of changes to a record. */
  @Get(':collection/:system/:id/history')
  async loadHistory(
    @Param('collection') collection: string,
    @Param('system') system: string,
    @Param('id') id: string,
  ): Promise<History> {
    return this.appService.loadHistory(collection, system, id);
  }

  /** List records which share this record's global id. */
  @Get(':collection/:system/:id/related')
  async listRelated(
    @Param('collection') collection: string,
    @Param('system') system: string,
    @Param('id') id: string,
    @Query() options?: { deleted?: boolean; at?: string },
  ): Promise<Ref[]> {
    return await this.appService.listRelated(collection, system, id, options);
  }

  /** List records which share this record's global id. */
  @Get(':collection/:system/:id/related/:reqSystem')
  async listRelatedInSystem(
    @Param('collection') collection: string,
    @Param('system') system: string,
    @Param('id') id: string,
    @Param('reqSystem') reqSystem: string,
    @Query() options?: { deleted?: boolean; at?: string },
  ): Promise<Ref[]> {
    return (
      await this.appService.listRelated(collection, system, id, options)
    ).filter((ref) => ref.system === reqSystem);
  }
}
