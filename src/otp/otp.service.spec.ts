import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as otpGenerator from 'otp-generator';
import { Otp } from 'db';
import { PrismaService } from '../db/prisma.service';
import { EmailService } from '../email/email.service';
import { OtpService } from './otp.service';

jest.mock('otp-generator', () => ({
  generate: jest.fn(),
}));

const mockPrismaService = {
  otp: {
    create: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
  },
};

const mockEmailService = {
  sendEmail: jest.fn(),
};

const mockOtp: Otp = {
  id: 'otp-id-1',
  email: 'test@example.com',
  otp: '123456',
  expiresAt: new Date(),
};

describe('OtpService', () => {
  let service: OtpService;
  let prisma: PrismaService;
  let emailService: EmailService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (otpGenerator.generate as jest.Mock).mockReturnValue('123456');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateOtp', () => {
    it('should generate and send an OTP', async () => {
      mockPrismaService.otp.deleteMany.mockResolvedValue({});
      mockPrismaService.otp.findFirst.mockResolvedValue(null);
      mockPrismaService.otp.create.mockResolvedValue(mockOtp);
      mockEmailService.sendEmail.mockResolvedValue({});

      const result = await service.generateOtp('test@example.com');
      expect(prisma.otp.deleteMany).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(otpGenerator.generate).toHaveBeenCalledWith(6, {
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false,
      });
      expect(prisma.otp.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          otp: '123456',
          expiresAt: expect.any(Date),
        },
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Your OTP is: 123456',
      );
      expect(result).toEqual({ message: 'OTP sent successfully' });
    });
  });

  describe('validateOtp', () => {
    it('should validate a correct OTP', async () => {
      mockPrismaService.otp.findFirst.mockResolvedValue(mockOtp);
      mockPrismaService.otp.delete.mockResolvedValue({});

      const result = await service.validateOtp('test@example.com', '123456');
      expect(prisma.otp.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', otp: '123456' },
      });
      expect(prisma.otp.delete).toHaveBeenCalledWith({
        where: { id: mockOtp.id },
      });
      expect(result).toEqual({ message: 'OTP validated successfully' });
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      mockPrismaService.otp.findFirst.mockResolvedValue(null);

      await expect(
        service.validateOtp('test@example.com', 'wrongotp'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
