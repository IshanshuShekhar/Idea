import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @UseGuards(JwtAuthGuard)
  @Get('state')
  async getJourneyState(@Req() req: Request & { user: any }) {
    return this.orchestratorService.getJourneyState(req.user.id);
  }

  @Get('demo-state')
  async getDemoState(@Req() req: Request) {
    const userId = (req.query.userId as string) || 'demo-user';
    return this.orchestratorService.getJourneyState(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('next-step')
  async getNextStep(@Req() req: Request & { user: any }) {
    return this.orchestratorService.determineNextStep(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async processChat(
    @Req() req: Request & { user: any },
    @Body() body: { message: string; history?: any[] }
  ) {
    return this.orchestratorService.processChat(req.user.id, body.message, body.history || []);
  }

  @UseGuards(JwtAuthGuard)
  @Get('candidate-details')
  async getCandidateDetails(@Req() req: Request & { user: any }) {
    return this.orchestratorService.getConsolidatedCandidateDetails(req.user.id);
  }

  @Get('demo-candidate-details')
  async getDemoCandidateDetails(@Req() req: Request) {
    const userId = (req.query.userId as string) || 'demo-user';
    return this.orchestratorService.getConsolidatedCandidateDetails(userId);
  }
}
