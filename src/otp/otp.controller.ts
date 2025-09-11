import { Controller, Post, Body } from '@nestjs/common';
import { OtpService } from './otp.service';
import { GenerateOtpDto } from './dto/generate-otp.dto';
import { ValidateOtpDto } from './dto/validate-otp.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('OTP')
@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('generate')
  generateOtp(@Body() generateOtpDto: GenerateOtpDto) {
    return this.otpService.generateOtp(generateOtpDto.email);
  }

  @Post('validate')
  validateOtp(@Body() validateOtpDto: ValidateOtpDto) {
    return this.otpService.validateOtp(validateOtpDto.email, validateOtpDto.otp);
  }
}