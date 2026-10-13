import { Controller, Get, Post, Put, Body, Req, Query, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpsertFieldDto, Provenance, ComprehensiveApplicantProfile } from '@educaro/shared';
import { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@Req() req: Request & { user: any }) {
    const profile = await this.profileService.getProfile(req.user.id);
    return {
      success: true,
      data: profile,
    };
  }

  @Get('comprehensive')
  async getComprehensiveProfile(@Req() req: Request & { user: any }) {
    const profile = await this.profileService.getComprehensiveProfile(req.user.id);
    const completion = this.profileService.computeCompletionMetrics(profile);
    return {
      success: true,
      data: profile,
      completion,
    };
  }

  @Put('comprehensive')
  async updateComprehensiveProfile(
    @Req() req: Request & { user: any },
    @Body() body: { data?: Partial<ComprehensiveApplicantProfile>; isDraft?: boolean } & Partial<ComprehensiveApplicantProfile>,
    @Query('draft') draftQuery?: string,
  ) {
    const profileData = body.data || body;
    const isDraft = body.isDraft !== undefined ? body.isDraft : draftQuery === 'true';
    const result = await this.profileService.saveComprehensiveProfile(
      req.user.id,
      profileData,
      isDraft,
    );
    return {
      success: true,
      data: result.profile,
      completion: result.completion,
    };
  }

  @Get('completion')
  async getProfileCompletion(@Req() req: Request & { user: any }) {
    const profile = await this.profileService.getComprehensiveProfile(req.user.id);
    const completion = this.profileService.computeCompletionMetrics(profile);
    return {
      success: true,
      data: completion,
    };
  }

  @Post('field')
  async upsertField(
    @Req() req: Request & { user: any },
    @Body() dto: UpsertFieldDto
  ) {
    const field = await this.profileService.upsertField(
      { userId: req.user.id, role: req.user.role, isAi: false },
      dto
    );
    return {
      success: true,
      data: field,
    };
  }

  @Post('candidate-details')
  async saveCandidateDetails(
    @Req() req: Request & { user: any },
    @Body()
    dto: {
      fullName: string;
      email?: string;
      phone?: string;
      age?: string;
      country?: string;
      germanLevel: string;
      englishLevel?: string;
    }
  ) {
    const result = await this.profileService.saveCandidateDetails(req.user.id, dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Endpoint simulating an AI Agent calling upsertField.
   * Tests and demonstrates Hard Rule 1 write guard enforcement live!
   */
  @Post('field/ai-upsert')
  async aiUpsertField(
    @Req() req: Request & { user: any },
    @Body() dto: UpsertFieldDto & { provenance?: Provenance }
  ) {
    const field = await this.profileService.upsertField(
      { userId: req.user.id, role: req.user.role, isAi: true },
      dto
    );
    return {
      success: true,
      data: field,
    };
  }
}
