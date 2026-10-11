import { Module } from '@nestjs/common';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { DatabaseModule } from '../database/database.module';
import { AgentEventsModule } from '../agent-events/agent-events.module';
import { ProfileModule } from '../profile/profile.module';
import { ConsistencyModule } from '../consistency/consistency.module';

@Module({
  imports: [DatabaseModule, AgentEventsModule, ProfileModule, ConsistencyModule],
  controllers: [OrchestratorController],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
