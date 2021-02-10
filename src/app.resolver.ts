import { BadRequestException, Logger } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  Resolver,
  ResolveField,
} from '@nestjs/graphql';
import { AppService } from './app.service';
import { Ref } from './interfaces';
import {
  Collection,
  CollectionInput,
  Document,
  DocumentInput,
  Event,
  HistoryResponse,
  ListResponse,
} from './schema';

@Resolver('Document')
export class AppResolver {
  private readonly logger = new Logger(AppResolver.name);

  constructor(private readonly appService: AppService) {}

  @Query()
  async list(
    @Args() { collection, globalId, ...options }: ListArgs,
  ): Promise<ListResponse> {
    this.logger.debug(
      `list: ${JSON.stringify({ collection, globalId, options })}`,
    );
    if (!globalId) {
      throw new BadRequestException();
    }
    const withContent = true; // TODO base this on selected fields
    return this.appService.list(collection, globalId, {
      withContent,
      ...options,
    });
  }

  @Query()
  async load(@Args() { uri, ...options }: LoadArgs): Promise<Document> {
    this.logger.debug(`load: ${JSON.stringify({ uri, options })}`);
    return this.appService.load(this.parseUri(uri), options);
  }

  @Query()
  async history(
    @Args() { uri, ...options }: HistoryArgs,
  ): Promise<HistoryResponse> {
    this.logger.debug(`history: ${JSON.stringify({ uri, options })}`);
    return this.appService.loadHistory(this.parseUri(uri), options);
  }

  @Mutation()
  async initialize(@Args('input') input: CollectionInput): Promise<Collection> {
    return this.appService.initialize(input);
  }

  @Mutation()
  async save(
    @Args('collection') collection: string,
    @Args('input') input: DocumentInput,
    @Args('merge') merge?: boolean,
  ): Promise<Document> {
    this.logger.debug(`save: ${JSON.stringify({ collection, input, merge })}`);
    return this.appService.save(collection, input, { merge });
  }

  @Mutation()
  async delete(@Args() { uri, ...options }: DeleteArgs): Promise<Document> {
    this.logger.debug(`delete: ${JSON.stringify({ uri, options })}`);
    return this.appService.delete(this.parseUri(uri), options);
  }

  @ResolveField()
  async related(
    @Parent() document,
    @Args('system') system?: string,
  ): Promise<Document[]> {
    this.logger.debug(`related: ${JSON.stringify({ document, system })}`);
    const withContent = true; // TODO base this on selected fields
    const results = await this.appService.list(
      document.collection,
      document.globalId,
      {
        system,
        withContent,
      },
    );
    return results.documents.filter(
      ({ system, id }) => system !== document.system || id !== document.id,
    );
  }

  @ResolveField()
  async events(@Parent() document: Document): Promise<Event[]> {
    const history = await this.appService.loadHistory(document);
    return history.events;
  }

  @ResolveField()
  async event(@Parent() document: Document): Promise<Event> {
    const history = await this.appService.loadHistory(document);
    return history.events?.[0];
  }

  private parseUri(uri: string): Ref {
    const parts = uri.split('/', 4).map(decodeURI);
    if (parts.length !== 4) {
      throw new BadRequestException();
    }
    const [, collection, system, id] = parts;
    return { collection, system, id };
  }
}

interface ListArgs {
  collection: string;
  system: string;
  globalId?: string;
  pageToken?: number;
  pageSize?: number;
  deleted?: boolean;
}
interface LoadArgs {
  uri: string;
  deleted?: boolean;
  at?: string;
}
interface HistoryArgs {
  uri: string;
  pageSize?: number;
  pageToken?: string;
}
interface DeleteArgs {
  uri: string;
  deletedAt?: Date;
}
