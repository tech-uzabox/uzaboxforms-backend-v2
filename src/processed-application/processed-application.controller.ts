import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser, type AuthenticatedUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProcessedApplicationDto } from './dto/create-processed-application.dto';
import { ProcessedApplicationService } from './processed-application.service';

@ApiTags('Processed Applications')
@Controller('processed-applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProcessedApplicationController {
    constructor(private readonly processedApplicationService: ProcessedApplicationService) {}

    @Post()
    create(@Body() createProcessedApplicationDto: CreateProcessedApplicationDto, @GetUser() user: AuthenticatedUser) {
        // We can add authorization here to make sure the user is the reviewer
        return this.processedApplicationService.create({ ...createProcessedApplicationDto, reviewerId: user.id });
    }
}