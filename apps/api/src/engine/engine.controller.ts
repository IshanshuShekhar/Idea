import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EngineService } from './engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import {
  Step1PersonalData,
  Step2AcademicData,
  Step3LanguageData,
  Step4ProjectsData,
  Step5BudgetData,
  Step6SensitiveScholarshipData,
} from '@educaro/shared';

@Controller('engine')
export class EngineController {
  constructor(private readonly engineService: EngineService) {}

  // --------------------------------------------------------------------------
  // PUBLIC / BROWSING CATALOG ENDPOINTS
  // --------------------------------------------------------------------------

  @Get('universities')
  async getAllUniversities() {
    const data = await this.engineService.getAllUniversities();
    return { success: true, data };
  }

  @Get('programmes')
  async getAllProgrammes() {
    const data = await this.engineService.getAllProgrammesWithUniversities();
    return { success: true, data };
  }

  @Get('scholarships')
  async getAllScholarships() {
    const data = await this.engineService.getAllScholarships();
    return { success: true, data };
  }

  @Get('exam-resources')
  async getExamResources(
    @Query('exam') exam?: string,
    @Query('type') type?: string,
    @Query('q') query?: string,
  ) {
    const data = await this.engineService.getExamResources({ exam, type, query });
    return { success: true, data };
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATED APPLICANT PROFILE ENDPOINTS
  // --------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: Request & { user: any }) {
    const profile = await this.engineService.getProfile(req.user.id);
    return { success: true, data: profile };
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  async saveProfile(
    @Req() req: Request & { user: any },
    @Body()
    dto: {
      step1: Step1PersonalData;
      step2: Step2AcademicData;
      step3: Step3LanguageData;
      step4: Step4ProjectsData;
      step5: Step5BudgetData;
      step6?: Step6SensitiveScholarshipData;
    },
  ) {
    const profile = await this.engineService.saveProfile(req.user.id, dto);
    return { success: true, data: profile };
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/withdraw-consent')
  async withdrawConsent(@Req() req: Request & { user: any }) {
    const result = await this.engineService.withdrawConsent(req.user.id);
    return { success: true, data: result };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile/sensitive-data')
  async deleteSensitiveData(@Req() req: Request & { user: any }) {
    const result = await this.engineService.deleteSensitiveData(req.user.id);
    return { success: true, data: result };
  }

  // --------------------------------------------------------------------------
  // RECOMMENDATION & SCHOLARSHIP MATCHING
  // --------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Get('scholarship-matches')
  async getScholarshipMatches(@Req() req: Request & { user: any }) {
    const data = await this.engineService.getScholarshipMatches(req.user.id);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('recommendations')
  async getRecommendations(@Req() req: Request & { user: any }) {
    const result = await this.engineService.getRecommendations(req.user.id);
    return { success: true, data: result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('recommendations')
  async getRecommendationsWithWeights(
    @Req() req: Request & { user: any },
    @Body()
    dto: {
      weights?: {
        academic?: number;
        subject?: number;
        language?: number;
        budget?: number;
        preferences?: number;
      };
    },
  ) {
    const result = await this.engineService.getRecommendations(req.user.id, dto?.weights);
    return { success: true, data: result };
  }

  // --------------------------------------------------------------------------
  // APPLICATION ROADMAP
  // --------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Get('roadmap')
  async getRoadmap(@Req() req: Request & { user: any }) {
    const steps = await this.engineService.getRoadmap(req.user.id);
    return { success: true, data: steps };
  }

  @UseGuards(JwtAuthGuard)
  @Post('roadmap/refresh')
  async refreshRoadmap(@Req() req: Request & { user: any }) {
    const steps = await this.engineService.generateFreshRoadmap(req.user.id);
    return { success: true, data: steps };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('roadmap/:stepId')
  async toggleRoadmapStep(
    @Req() req: Request & { user: any },
    @Param('stepId') stepId: string,
    @Body() body: { completed: boolean },
  ) {
    const updated = await this.engineService.toggleRoadmapStep(req.user.id, stepId, body.completed);
    return { success: true, data: updated };
  }

  // --------------------------------------------------------------------------
  // SHORTLIST MANAGEMENT
  // --------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Get('shortlists')
  async getShortlists(@Req() req: Request & { user: any }) {
    const shortlists = await this.engineService.getShortlists(req.user.id);
    return { success: true, data: shortlists };
  }

  @UseGuards(JwtAuthGuard)
  @Post('shortlists')
  async addShortlistItem(
    @Req() req: Request & { user: any },
    @Body()
    dto: {
      itemType: 'PROGRAMME' | 'SCHOLARSHIP';
      itemId: string;
      notes?: string;
    },
  ) {
    const item = await this.engineService.addShortlistItem(req.user.id, dto);
    return { success: true, data: item };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('shortlists/:itemType/:itemId')
  async removeShortlistItem(
    @Req() req: Request & { user: any },
    @Param('itemType') itemType: string,
    @Param('itemId') itemId: string,
  ) {
    const result = await this.engineService.removeShortlistItem(req.user.id, itemType, itemId);
    return { success: true, data: result };
  }

  // --------------------------------------------------------------------------
  // AI ADVISORY ASSISTANT
  // --------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post('assistant')
  async askAiAssistant(
    @Req() req: Request & { user: any },
    @Body() body: { query: string },
  ) {
    const result = await this.engineService.askAiAssistant(req.user.id, body.query || '');
    return { success: true, data: result };
  }
}
