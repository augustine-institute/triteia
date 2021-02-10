import { join } from 'path';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TerminusModule } from '@nestjs/terminus';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppHealthIndicator } from './app.health';
import { AppResolver } from './app.resolver';

@Module({
  imports: [
    TerminusModule,
    GraphQLModule.forRoot({
      typePaths: ['./**/*.graphql'],
      definitions: {
        path: join(process.cwd(), 'src/schema/index.ts'),
        outputAs: 'class',
      },
      resolvers: {
        JSON: GraphQLJSON,
        JSONObject: GraphQLJSONObject,
      },
      debug: true,
      playground: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AppHealthIndicator, AppResolver],
})
export class AppModule {}
