import { Test, TestingModule } from '@nestjs/testing';
import { AddToDatabaseService } from './add-to-database.service';
import { PrismaService } from '../db/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrismaService = {
  addToDatabase: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockAuditLogService = {
  log: jest.fn(),
};

describe('AddToDatabaseService', () => {
  let service: AddToDatabaseService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddToDatabaseService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<AddToDatabaseService>(AddToDatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new add to database entry', async () => {
      const mockAddToDatabase = { id: '1', name: 'Test', status: 'ENABLED' as const, levels: [] };
      mockPrismaService.addToDatabase.create.mockResolvedValue(mockAddToDatabase);

      const result = await service.create({ name: 'Test', status: 'ENABLED' });
      expect(result).toEqual(mockAddToDatabase);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        action: 'ADD_TO_DATABASE_CREATED',
        resource: 'AddToDatabase',
        resourceId: '1',
        status: 'SUCCESS',
        details: { name: 'Test', status: 'ENABLED' },
      });
    });
  });
});
