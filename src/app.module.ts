import { join } from 'path';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TerminusModule } from '@nestjs/terminus';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppHealthIndicator } from './app.health';
import { AppResolver } from './app.resolver';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    TerminusModule,
    PrometheusModule.register(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
      ...(process.env.NODE_ENV === 'development' && {
        definitions: {
          path: join(process.cwd(), 'src/schema/index.ts'),
          outputAs: 'class',
        },
      }),
      resolvers: {
        JSON: GraphQLJSON,
        JSONObject: GraphQLJSONObject,
      },
      debug: true,
      playground: true,
    }),
    DatabaseModule.register(),
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppHealthIndicator, AppResolver],
})
export class AppModule {}
