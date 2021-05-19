import { join } from 'path';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TerminusModule } from '@nestjs/terminus';
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
    GraphQLModule.forRoot({
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
