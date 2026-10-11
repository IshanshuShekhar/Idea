import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpsertFieldDto, Provenance } from '@educaro/shared';
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

  @Get('category/:category')
  async getCategoryFields(
    @Req() req: Request & { user: any },
    @Param('category') category: string
  ) {
    const fields = await this.profileService.getCategoryFields(req.user.id, category);
    return {
      success: true,
      data: fields,
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

  @Delete('field/:fieldKey')
  async deleteField(
    @Req() req: Request & { user: any },
    @Param('fieldKey') fieldKey: string
  ) {
    const result = await this.profileService.deleteField(req.user.id, fieldKey);
    return {
      success: true,
      data: result,
    };
  }

  @Post('confirm-field')
  async confirmField(
    @Req() req: Request & { user: any },
    @Body() body: { fieldKey: string; confirmedValue?: string }
  ) {
    const existing = await this.profileService.getProfile(req.user.id);
    const target = existing.fields.find(f => f.fieldKey === body.fieldKey);
    const value = body.confirmedValue ?? target?.value ?? '';
    const category = target?.category || 'personal';

    const field = await this.profileService.upsertField(
      { userId: req.user.id, role: req.user.role, isAi: false },
      {
        category,
        fieldKey: body.fieldKey,
        value,
        provenance: Provenance.APPLICANT_PROVIDED,
        confidence: 1.0,
      }
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
      targetPathway?: string;
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
