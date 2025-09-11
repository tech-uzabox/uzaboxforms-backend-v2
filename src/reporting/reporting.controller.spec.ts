import { Test, TestingModule } from '@nestjs/testing';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

const mockReportingService = {
  getProcesses: jest.fn(),
  getProcessApplications: jest.fn(),
};

describe('ReportingController', () => {
  let controller: ReportingController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [
        { provide: ReportingService, useValue: mockReportingService },
      ],
    }).compile();

    controller = module.get<ReportingController>(ReportingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
