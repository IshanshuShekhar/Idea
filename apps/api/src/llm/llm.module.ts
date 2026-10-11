import { Module, Global } from '@nestjs/common';
import { LlmService } from './llm.service';
import { AgentEventsModule } from '../agent-events/agent-events.module';

@Global()
@Module({
  imports: [AgentEventsModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
