import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EngineController } from './engine.controller';
import { AdminEngineController } from './admin.controller';
import { EngineService } from './engine.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EngineController, AdminEngineController],
  providers: [EngineService],
  exports: [EngineService],
})
export class EngineModule {}
