import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { QrCodeService } from './qr-code.service';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
import { UpdateQrCodeDto } from './dto/update-qr-code.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/get-user.decorator';

@ApiTags('QR Codes')
@Controller('qr-codes')
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate QR code for document' })
  @ApiResponse({ status: 200, description: 'QR code generated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() createQrCodeDto: CreateQrCodeDto, @GetUser() user: AuthenticatedUser) {
    return this.qrCodeService.generateQrCode(createQrCodeDto, user.id);
  }

  @Get()
  findAll() {
    return this.qrCodeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.qrCodeService.findOne(id);
  }

  @Get('by-qr-code-id/:qrCodeId')
  findByQrCodeId(@Param('qrCodeId') qrCodeId: string) {
    return this.qrCodeService.findByQrCodeId(qrCodeId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQrCodeDto: UpdateQrCodeDto) {
    return this.qrCodeService.update(id, updateQrCodeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.qrCodeService.remove(id);
  }

  @Get('by-creator/:creatorId')
  findByCreatorId(@Param('creatorId') creatorId: string) {
    return this.qrCodeService.findByCreatorId(creatorId);
  }
}
