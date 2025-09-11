import { Module } from '@nestjs/common';
import { ProcessRoleService } from './process-role.service';
import { ProcessRoleController } from './process-role.controller';

@Module({
  providers: [ProcessRoleService],
  controllers: [ProcessRoleController]
})
export class ProcessRoleModule {}
