import { Module } from '@nestjs/common';
import { QrCodeService } from './qr-code.service';
import { QrCodeController } from './qr-code.controller';

@Module({
  providers: [QrCodeService],
  controllers: [QrCodeController]
})
export class QrCodeModule {}
