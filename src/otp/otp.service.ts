import { BadRequestException, Injectable } from '@nestjs/common';
import * as otpGenerator from 'otp-generator';
import { PrismaService } from '../db/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async generateOtp(email: string): Promise<{ message: string }> {
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

    // Send OTP via email
    await this.emailService.sendEmail(email, `Your OTP is: ${otp}`);

    return { message: 'OTP sent successfully' };
  }

  async validateOtp(email: string, otp: string): Promise<{ message: string }> {
    const otpRecord = await this.prisma.otp.findFirst({
      where: { email, otp },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid OTP or email.');
    }

    // Delete the OTP after successful validation
    await this.prisma.otp.delete({ where: { id: otpRecord.id } });

    return { message: 'OTP validated successfully' };
  }
}
