import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Module({})
export class DatabaseModule {
  static readonly vendor = process.env?.DB_VENDOR || 'mariadb';

  static async register(
    vendor: string = DatabaseModule.vendor,
  ): Promise<DynamicModule> {
    const path = vendor.toLowerCase();
    const name = path.charAt(0).toUpperCase() + path.slice(1);
    const dbModule = await import(`./${path}/${path}.module`);
    const dbModuleClass = dbModule[`${name}Module`];
    return {
      module: DatabaseModule,
      imports: [dbModuleClass],
      providers: [{ provide: DatabaseService, useExisting: `${name}Service` }],
      exports: [DatabaseService],
    };
  }
}
