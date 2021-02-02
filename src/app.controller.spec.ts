import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { AppHealthIndicator } from './app.health';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [AppController],
      providers: [AppHealthIndicator, AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return something', async () => {
      expect(await appController.root()).toBeDefined();
    });
  });

  describe('health', () => {
    it('should be ok', async () => {
      const health = await appController.healthCheck();
      expect(health).toEqual(expect.objectContaining({ status: 'ok' }));
    });
  });
});
