import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ConsistencyService } from './consistency.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { ResolveInconsistencyDto } from '@educaro/shared';

@Controller('consistency')
export class ConsistencyController {
  constructor(private readonly consistencyService: ConsistencyService) {}

  @UseGuards(JwtAuthGuard)
  @Get('check')
  async check(@Req() req: Request & { user: any }) {
    return this.consistencyService.checkInconsistencies(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('resolve')
  async resolve(
    @Req() req: Request & { user: any },
    @Body() dto: ResolveInconsistencyDto,
  ) {
    return this.consistencyService.resolveInconsistency(req.user.id, dto);
  }
}
