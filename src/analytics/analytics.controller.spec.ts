import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

const mockAnalyticsService = {
  getFormAnalyticsData: jest.fn().mockResolvedValue([]),
  getApplicationsAnalytics: jest.fn().mockResolvedValue([]),
  getProcessAnalytics: jest.fn().mockResolvedValue([]),
  getFormResponseAnalytics: jest.fn().mockResolvedValue([]),
  getMonthlyApplicantProcessesCount: jest.fn().mockResolvedValue([]),
  getProcessDistributionData: jest.fn().mockResolvedValue([]),
};

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFormAnalyticsData', () => {
    it('should return form analytics data', async () => {
      expect(await controller.getFormAnalyticsData('process-id-1', 'form-id-1')).toEqual([]);
      expect(mockAnalyticsService.getFormAnalyticsData).toHaveBeenCalledWith('process-id-1', 'form-id-1');
    });
  });

  describe('getApplicationsAnalytics', () => {
    it('should return applications analytics', async () => {
      expect(await controller.getApplicationsAnalytics()).toEqual([]);
      expect(mockAnalyticsService.getApplicationsAnalytics).toHaveBeenCalled();
    });
  });

  describe('getProcessAnalytics', () => {
    it('should return process analytics', async () => {
      expect(await controller.getProcessAnalytics()).toEqual([]);
      expect(mockAnalyticsService.getProcessAnalytics).toHaveBeenCalled();
    });
  });

  describe('getFormResponseAnalytics', () => {
    it('should return form response analytics', async () => {
      expect(await controller.getFormResponseAnalytics()).toEqual([]);
      expect(mockAnalyticsService.getFormResponseAnalytics).toHaveBeenCalled();
    });
  });

  describe('getMonthlyApplicantProcessesCount', () => {
    it('should return monthly applicant processes count', async () => {
      expect(await controller.getMonthlyApplicantProcessesCount()).toEqual([]);
      expect(mockAnalyticsService.getMonthlyApplicantProcessesCount).toHaveBeenCalled();
    });
  });

  describe('getProcessDistributionData', () => {
    it('should return process distribution data', async () => {
      expect(await controller.getProcessDistributionData()).toEqual([]);
      expect(mockAnalyticsService.getProcessDistributionData).toHaveBeenCalled();
    });
  });
});