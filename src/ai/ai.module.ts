import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { FormModule } from '../form/form.module';
import { ProcessModule } from '../process/process.module';
import { FormResponseModule } from '../form-response/form-response.module';
import { GroupModule } from '../group/group.module';
import { RoleModule } from '../role/role.module';
import { UserModule } from '../user/user.module';
import { ApplicantProcessModule } from '../applicant-process/applicant-process.module';

@Module({
  imports: [
    FormModule,
    ProcessModule,
    FormResponseModule,
    GroupModule,
    RoleModule,
    UserModule,
    ApplicantProcessModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
