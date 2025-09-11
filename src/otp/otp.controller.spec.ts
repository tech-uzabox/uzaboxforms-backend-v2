import { Test, TestingModule } from '@nestjs/testing';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { ZodValidationPipe } from 'nestjs-zod';
import { APP_PIPE } from '@nestjs/core';

const mockOtpService = {
  generateOtp: jest.fn(),
  validateOtp: jest.fn(),
};

describe('OtpController', () => {
  let controller: OtpController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OtpController],
      providers: [
        { provide: OtpService, useValue: mockOtpService },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
      ],
    }).compile();

    controller = module.get<OtpController>(OtpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateOtp', () => {
    it('should generate and send an OTP', async () => {
      const generateOtpDto = { email: 'test@example.com' };
      mockOtpService.generateOtp.mockResolvedValue({ message: 'OTP sent successfully' });

      const result = await controller.generateOtp(generateOtpDto);
      expect(result).toEqual({ message: 'OTP sent successfully' });
      expect(mockOtpService.generateOtp).toHaveBeenCalledWith(generateOtpDto.email);
    });

    it('should throw error if generation fails', async () => {
      const generateOtpDto = { email: 'test@example.com' };
      mockOtpService.generateOtp.mockRejectedValue(new Error('Generation failed'));

      await expect(controller.generateOtp(generateOtpDto)).rejects.toThrow('Generation failed');
    });
  });

  describe('validateOtp', () => {
    it('should validate an OTP', async () => {
      const validateOtpDto = { email: 'test@example.com', otp: '123456' };
      mockOtpService.validateOtp.mockResolvedValue({ message: 'OTP validated successfully' });

      const result = await controller.validateOtp(validateOtpDto);
      expect(result).toEqual({ message: 'OTP validated successfully' });
      expect(mockOtpService.validateOtp).toHaveBeenCalledWith(validateOtpDto.email, validateOtpDto.otp);
    });

    it('should throw error if validation fails', async () => {
      const validateOtpDto = { email: 'test@example.com', otp: '123456' };
      mockOtpService.validateOtp.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.validateOtp(validateOtpDto)).rejects.toThrow('Validation failed');
    });
  });
});
