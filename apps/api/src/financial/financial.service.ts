import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  GERMAN_CITIES_CATALOG,
  FINANCIAL_DATA_SOURCES,
  GERMAN_STATUTORY_CONSTANTS,
  calculateFinancialScenario,
  CalculateScenarioParams,
  FinancialScenario,
} from '@educaro/shared';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FinancialService {
  private readonly logger = new Logger(FinancialService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Returns verified German cities and data sources catalog
   */
  getCatalog() {
    return {
      cities: GERMAN_CITIES_CATALOG,
      sources: FINANCIAL_DATA_SOURCES,
      constants: GERMAN_STATUTORY_CONSTANTS,
    };
  }

  /**
   * Calculate a single financial scenario deterministically
   */
  calculate(params: CalculateScenarioParams): FinancialScenario {
    return calculateFinancialScenario(params, GERMAN_CITIES_CATALOG);
  }

  /**
   * Get all persisted financial scenarios for the authenticated applicant
   */
  async getMyScenarios(userId: string): Promise<FinancialScenario[]> {
    const res = await this.db.query(
      `SELECT * FROM financial_scenarios WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId],
    );

    return res.rows.map((row) => {
      try {
        const parsed = JSON.parse(row.scenario_data);
        return {
          ...parsed,
          id: row.id,
          name: row.scenario_name,
        };
      } catch (e) {
        return {
          id: row.id,
          name: row.scenario_name,
        } as any;
      }
    });
  }

  /**
   * Save or update a financial scenario
   */
  async saveScenario(userId: string, scenario: FinancialScenario): Promise<FinancialScenario> {
    const id = scenario.id || `scen_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const dataJson = JSON.stringify(scenario);

    // Check if exists
    const existing = await this.db.query(
      `SELECT id FROM financial_scenarios WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );

    if (existing.rows.length > 0) {
      await this.db.query(
        `UPDATE financial_scenarios SET scenario_name = $1, scenario_data = $2, updated_at = $3 WHERE id = $4 AND user_id = $5`,
        [scenario.name, dataJson, now, id, userId],
      );
    } else {
      await this.db.query(
        `INSERT INTO financial_scenarios (id, user_id, scenario_name, scenario_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5)`,
        [id, userId, scenario.name, dataJson, now],
      );
    }

    this.logger.log(`Financial scenario saved: ${id} (${scenario.name}) for user ${userId}`);
    return {
      ...scenario,
      id,
      updatedAt: now,
    };
  }

  /**
   * Delete a financial scenario
   */
  async deleteScenario(userId: string, scenarioId: string): Promise<{ success: boolean; id: string }> {
    const res = await this.db.query(
      `SELECT id FROM financial_scenarios WHERE id = $1 AND user_id = $2`,
      [scenarioId, userId],
    );

    if (!res.rows.length) {
      throw new NotFoundException('Scenario not found or does not belong to this applicant.');
    }

    await this.db.query(
      `DELETE FROM financial_scenarios WHERE id = $1 AND user_id = $2`,
      [scenarioId, userId],
    );

    return { success: true, id: scenarioId };
  }
}
