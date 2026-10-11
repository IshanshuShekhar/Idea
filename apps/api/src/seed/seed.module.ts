import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { ProfileModule } from '../profile/profile.module';
import { AgentEventsModule } from '../agent-events/agent-events.module';
import { ConsistencyModule } from '../consistency/consistency.module';

@Module({
  imports: [ProfileModule, AgentEventsModule, ConsistencyModule],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
