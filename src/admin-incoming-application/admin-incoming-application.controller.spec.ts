import { Test, TestingModule } from '@nestjs/testing';
import { ApplicantProcess } from 'db';
import { AdminIncomingApplicationController } from './admin-incoming-application.controller';
import { AdminIncomingApplicationService } from './admin-incoming-application.service';

const mockApplicantProcess: ApplicantProcess = {
  id: 'app-proc-id-1',
  applicantId: 'user-id-1',
  processId: 'process-id-1',
  status: 'ENABLED',
  createdAt: new Date(),
};

const mockAdminIncomingApplicationService = {
  getAllPendingApplications: jest
    .fn()
    .mockResolvedValue([mockApplicantProcess]),
  getAllCompletedApplications: jest
    .fn()
    .mockResolvedValue([mockApplicantProcess]),
  getAllDisabledApplications: jest
    .fn()
    .mockResolvedValue([mockApplicantProcess]),
  getSingleApplication: jest.fn().mockResolvedValue(mockApplicantProcess),
  getAllApplicationsForProcess: jest
    .fn()
    .mockResolvedValue([mockApplicantProcess]),
};

describe('AdminIncomingApplicationController', () => {
  let controller: AdminIncomingApplicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminIncomingApplicationController],
      providers: [
        {
          provide: AdminIncomingApplicationService,
          useValue: mockAdminIncomingApplicationService,
        },
      ],
    }).compile();

    controller = module.get<AdminIncomingApplicationController>(
      AdminIncomingApplicationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllPendingApplications', () => {
    it('should return all pending applications', async () => {
      expect(await controller.getAllPendingApplications()).toEqual([
        mockApplicantProcess,
      ]);
      expect(
        mockAdminIncomingApplicationService.getAllPendingApplications,
      ).toHaveBeenCalled();
    });
  });

  describe('getAllCompletedApplications', () => {
    it('should return all completed applications', async () => {
      expect(await controller.getAllCompletedApplications()).toEqual([
        mockApplicantProcess,
      ]);
      expect(
        mockAdminIncomingApplicationService.getAllCompletedApplications,
      ).toHaveBeenCalled();
    });
  });

  describe('getAllDisabledApplications', () => {
    it('should return all disabled applications', async () => {
      expect(await controller.getAllDisabledApplications()).toEqual([
        mockApplicantProcess,
      ]);
      expect(
        mockAdminIncomingApplicationService.getAllDisabledApplications,
      ).toHaveBeenCalled();
    });
  });

  describe('getSingleApplication', () => {
    it('should return a single application', async () => {
      expect(
        await controller.getSingleApplication('process-id-1', 'app-proc-id-1'),
      ).toEqual(mockApplicantProcess);
      expect(
        mockAdminIncomingApplicationService.getSingleApplication,
      ).toHaveBeenCalledWith('process-id-1', 'app-proc-id-1');
    });
  });

  describe('getAllApplicationsForProcess', () => {
    it('should return all applications for a specific process', async () => {
      expect(
        await controller.getAllApplicationsForProcess('process-id-1'),
      ).toEqual([mockApplicantProcess]);
      expect(
        mockAdminIncomingApplicationService.getAllApplicationsForProcess,
      ).toHaveBeenCalledWith('process-id-1');
    });
  });
});
