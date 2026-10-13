import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinancialService } from './financial.service';
import { CalculateScenarioParams, FinancialScenario } from '@educaro/shared';

@Controller('financial')
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  /**
   * GET /api/financial/cities
   * Public: returns verified German cities catalog, data sources, and statutory rates.
   */
  @Get('cities')
  getCatalog() {
    return {
      status: 'success',
      data: this.financialService.getCatalog(),
    };
  }

  /**
   * POST /api/financial/calculate
   * Calculates a scenario deterministically given input assumptions.
   */
  @Post('calculate')
  calculate(@Body() body: CalculateScenarioParams) {
    return {
      status: 'success',
      data: this.financialService.calculate(body),
    };
  }

  /**
   * GET /api/financial/scenarios
   * Authenticated: returns all saved financial scenarios for the user.
   */
  @UseGuards(JwtAuthGuard)
  @Get('scenarios')
  async getMyScenarios(@Req() req: Request & { user: any }) {
    const list = await this.financialService.getMyScenarios(req.user.id);
    return {
      status: 'success',
      data: list,
    };
  }

  /**
   * POST /api/financial/scenarios
   * Authenticated: saves or updates a financial scenario.
   */
  @UseGuards(JwtAuthGuard)
  @Post('scenarios')
  async saveScenario(
    @Req() req: Request & { user: any },
    @Body() scenario: FinancialScenario,
  ) {
    const saved = await this.financialService.saveScenario(req.user.id, scenario);
    return {
      status: 'success',
      data: saved,
    };
  }

  /**
   * DELETE /api/financial/scenarios/:id
   * Authenticated: deletes a financial scenario.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('scenarios/:id')
  async deleteScenario(
    @Req() req: Request & { user: any },
    @Param('id') id: string,
  ) {
    const res = await this.financialService.deleteScenario(req.user.id, id);
    return {
      status: 'success',
      data: res,
    };
  }
}
