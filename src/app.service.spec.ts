import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { DatabaseModule, DatabaseService } from './database';

describe('AppService', () => {
  let service: AppService;
  let db: DatabaseService;
  let dbSpy;

  const collection = 'tests';
  const system = 'mock-system';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule.register('mockdb')],
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
    db = module.get<DatabaseService>(DatabaseService);

    dbSpy = {
      load: jest.spyOn(db, 'load'),
      create: jest.spyOn(db, 'create'),
      update: jest.spyOn(db, 'update'),
      createEvent: jest.spyOn(db, 'createEvent'),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create records', async () => {
    const id = 'new';
    const name = 'test';
    const ref = { collection, system, id };
    const input = {
      system,
      id,
      name,
      content: { id, name },
    };

    dbSpy.load.mockImplementationOnce(() => {
      throw new NotFoundException();
    });

    const result = await service.save(ref, input);

    expect(dbSpy.update).not.toBeCalled();
    expect(dbSpy.create).toBeCalledWith(collection, input);
    expect(dbSpy.createEvent).toBeCalledWith(
      ref,
      expect.objectContaining({
        changes: expect.arrayContaining([
          {
            op: 'add',
            path: '/id',
            value: id,
          },
        ]),
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        system,
        id,
        name,
      }),
    );

    expect(result.globalId).toBeUndefined();
  });

  it('should update records', async () => {
    const id = 'mock-1234';
    const name = 'test';
    const ref = { collection, system, id };
    const input = {
      system,
      id,
      name,
      content: { id, name },
    };

    const result = await service.save(ref, input);

    expect(dbSpy.create).not.toBeCalled();
    expect(dbSpy.update).toBeCalledWith(ref, input);
    expect(dbSpy.createEvent).toBeCalledWith(
      ref,
      expect.objectContaining({
        changes: expect.arrayContaining([
          {
            op: 'replace',
            path: '/name',
            value: name,
          },
        ]),
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        system,
        id,
        name,
      }),
    );

    expect(result.globalId).toBeUndefined();
  });

  it('should not save empty events', async () => {
    const id = 'mock-1234';
    const ref = { collection, system, id };

    const { createdAt, updatedAt, ...input } = await db.load(ref);

    const result = await service.save(ref, input);

    expect(dbSpy.update).toBeCalledWith(ref, input);
    expect(dbSpy.createEvent).not.toBeCalled();

    expect(result.event?.changes).toEqual([]);
  });
});
