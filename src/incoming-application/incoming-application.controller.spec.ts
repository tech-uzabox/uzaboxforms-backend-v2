import { Test, TestingModule } from '@nestjs/testing';
import { ApplicantProcess, User } from 'db';
import { AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { IncomingApplicationController } from './incoming-application.controller';
import { IncomingApplicationService } from './incoming-application.service';

const mockUser: User = {
  id: 'user-id-1',
  email: 'test@example.com',
  password: 'hashed',
  firstName: 'Test',
  lastName: 'User',
  photo: null,
  googleId: null,
  status: 'ENABLED',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockApplicantProcess: ApplicantProcess = {
  id: 'app-proc-id-1',
  applicantId: 'user-id-1',
  processId: 'process-id-1',
  status: 'ENABLED',
  createdAt: new Date(),
};

const mockIncomingApplicationService = {
  getPendingApplications: jest.fn().mockResolvedValue([mockApplicantProcess]),
  getPendingApplicationForProcess: jest
    .fn()
    .mockResolvedValue([mockApplicantProcess]),
  getSingleApplicantProcess: jest.fn().mockResolvedValue(mockApplicantProcess),
  getCompletedApplications: jest.fn().mockResolvedValue([mockApplicantProcess]),
  getCompletedFormsForProcess: jest
    .fn()
    .mockResolvedValue([mockApplicantProcess]),
  getCompletedSingleApplicantProcess: jest
    .fn()
    .mockResolvedValue(mockApplicantProcess),
  getDisabledApplications: jest.fn().mockResolvedValue([mockApplicantProcess]),
};

describe('IncomingApplicationController', () => {
  let controller: IncomingApplicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncomingApplicationController],
      providers: [
        {
          provide: IncomingApplicationService,
          useValue: mockIncomingApplicationService,
        },
      ],
    }).compile();

    controller = module.get<IncomingApplicationController>(
      IncomingApplicationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPendingApplications', () => {
    it('should return pending applications', async () => {
      expect(
        await controller.getPendingApplications(mockUser as AuthenticatedUser),
      ).toEqual([mockApplicantProcess]);
      expect(
        mockIncomingApplicationService.getPendingApplications,
      ).toHaveBeenCalledWith(mockUser.id, mockUser);
    });
  });

  describe('getPendingApplicationForProcess', () => {
    it('should return pending applications for a process', async () => {
      expect(
        await controller.getPendingApplicationForProcess(
          'process-id-1',
          mockUser as AuthenticatedUser,
        ),
      ).toEqual([mockApplicantProcess]);
      expect(
        mockIncomingApplicationService.getPendingApplicationForProcess,
      ).toHaveBeenCalledWith('process-id-1', mockUser.id, mockUser);
    });
  });

  describe('getSingleApplicantProcess', () => {
    it('should return a single applicant process', async () => {
      expect(
        await controller.getSingleApplicantProcess(
          'app-proc-id-1',
          mockUser as AuthenticatedUser,
        ),
      ).toEqual(mockApplicantProcess);
      expect(
        mockIncomingApplicationService.getSingleApplicantProcess,
      ).toHaveBeenCalledWith('app-proc-id-1', mockUser.id, mockUser);
    });
  });

  describe('getCompletedApplications', () => {
    it('should return completed applications', async () => {
      expect(
        await controller.getCompletedApplications(
          mockUser as AuthenticatedUser,
        ),
      ).toEqual([mockApplicantProcess]);
      expect(
        mockIncomingApplicationService.getCompletedApplications,
      ).toHaveBeenCalledWith(mockUser.id, mockUser);
    });
  });

  describe('getCompletedFormsForProcess', () => {
    it('should return completed forms for a process', async () => {
      expect(
        await controller.getCompletedFormsForProcess(
          'process-id-1',
          mockUser as AuthenticatedUser,
        ),
      ).toEqual([mockApplicantProcess]);
      expect(
        mockIncomingApplicationService.getCompletedFormsForProcess,
      ).toHaveBeenCalledWith('process-id-1', mockUser.id, mockUser);
    });
  });

  describe('getCompletedSingleApplicantProcess', () => {
    it('should return a single completed applicant process', async () => {
      expect(
        await controller.getCompletedSingleApplicantProcess(
          'app-proc-id-1',
          mockUser as AuthenticatedUser,
        ),
      ).toEqual(mockApplicantProcess);
      expect(
        mockIncomingApplicationService.getCompletedSingleApplicantProcess,
      ).toHaveBeenCalledWith('app-proc-id-1', mockUser.id, mockUser);
    });
  });

  describe('getDisabledApplications', () => {
    it('should return disabled applications', async () => {
      expect(
        await controller.getDisabledApplications(mockUser as AuthenticatedUser),
      ).toEqual([mockApplicantProcess]);
      expect(
        mockIncomingApplicationService.getDisabledApplications,
      ).toHaveBeenCalledWith(mockUser.id, mockUser);
    });
  });
});
