import { BadRequestException, Injectable } from '@nestjs/common';
import * as otpGenerator from 'otp-generator';
import { PrismaService } from '../db/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private auditLogService: AuditLogService,
  ) {}

  async generateOtp(email: string, type?: string): Promise<{ message: string }> {
    // Look up user by email to get userId for audit logging
    const user = await this.prisma.user.findFirst({ where: { email } });

    // Delete any existing OTPs for this email
    await this.prisma.otp.deleteMany({ where: { email } });

    let otp: string = '';
    let isUnique = false;
    while (!isUnique) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false,
      });
      const existingOtp = await this.prisma.otp.findFirst({ where: { otp } });
      if (!existingOtp) {
        isUnique = true;
      }
    }

    await this.prisma.otp.create({
      data: {
        email,
        otp,
        expiresAt: new Date(new Date().getTime() + 10 * 60000), // OTP expires in 10 minutes
      },
    });

    // Send OTP via email using professional template
    const purpose = type === 'email_verification' 
      ? 'email verification'
      : type === 'password_reset'
      ? 'password reset'
      : 'verification';
    
    await this.emailService.sendOtpEmail(email, otp, purpose);

    // Log audit only if user exists (account has been created)
    if (user?.id) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'OTP_GENERATED',
        resource: 'OTP',
        resourceId: user.id,
        status: 'SUCCESS',
        details: {
          email,
          type: type || 'general',
        },
      });
    }

    return { message: 'OTP sent successfully' };
  }

  async validateOtp(email: string, otp: string, type?: string): Promise<{ message: string }> {
    const otpRecord = await this.prisma.otp.findFirst({
      where: { email, otp },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid OTP or email.');
    }

    // Check if OTP has expired
    if (otpRecord.expiresAt < new Date()) {
      // Delete expired OTP
      await this.prisma.otp.delete({ where: { id: otpRecord.id } });
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Delete the OTP after successful validation
    await this.prisma.otp.delete({ where: { id: otpRecord.id } });

    return { message: 'OTP validated successfully' };
  }
}
