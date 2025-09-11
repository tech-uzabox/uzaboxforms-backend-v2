import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from './reporting.service';
import { PrismaService } from '../db/prisma.service';

const mockPrismaService = {
  process: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('ReportingService', () => {
  let service: ReportingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProcesses', () => {
    it('should return processes with applications', async () => {
      const mockProcess = {
        id: '1',
        name: 'Test Process',
        group: { id: 'group-1', name: 'Test Group' },
        applicantProcesses: [
          {
            applicant: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
          },
        ],
      };
      mockPrismaService.process.findMany.mockResolvedValue([mockProcess]);

      const result = await service.getProcesses();
      expect(result).toEqual([
        {
          _id: '1',
          name: 'Test Process',
          group: { id: 'group-1', name: 'Test Group' },
          applications: [
            {
              applicant: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
              },
            },
          ],
        },
      ]);
    });
  });

  describe('getProcessApplications', () => {
    it('should return process applications', async () => {
      const mockProcess = {
        id: '1',
        applicantProcesses: [
          {
            applicant: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
            },
            responses: [
              {
                form: { name: 'Form 1' },
              },
            ],
          },
        ],
      };
      mockPrismaService.process.findUnique.mockResolvedValue(mockProcess);

      const result = await service.getProcessApplications('1');
      expect(result).toEqual([
        {
          applicant: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          responses: [
            {
              form: { name: 'Form 1' },
            },
          ],
        },
      ]);
    });

    it('should return empty array if process not found', async () => {
      mockPrismaService.process.findUnique.mockResolvedValue(null);

      const result = await service.getProcessApplications('nonexistent');
      expect(result).toEqual([]);
    });
  });
});
