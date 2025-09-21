import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
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

    @Get(':userId')
    getProcessedApplicationsByUser(@Param('userId') userId: string, @GetUser() user: AuthenticatedUser) {
        return this.processedApplicationService.getProcessedApplicationsByUser(userId);
    }

    @Get(':userId/:processId')
    getProcessedApplicationsByUserAndProcess(
        @Param('userId') userId: string,
        @Param('processId') processId: string,
        @GetUser() user: AuthenticatedUser,
    ) {
        return this.processedApplicationService.getProcessedApplicationsByUserAndProcess(userId, processId);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateData: Partial<CreateProcessedApplicationDto>, @GetUser() user: AuthenticatedUser) {
        return this.processedApplicationService.update(id, updateData);
    }

    @Get(':userId/:processId/:applicantProcessId')
    getSingleProcessedApplication(
        @Param('userId') userId: string,
        @Param('processId') processId: string,
        @Param('applicantProcessId') applicantProcessId: string,
        @GetUser() user: AuthenticatedUser,
    ) {
        return this.processedApplicationService.getSingleProcessedApplication(userId, processId, applicantProcessId);
    }
}
