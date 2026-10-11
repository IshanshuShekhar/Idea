import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AgentEventsService } from '../agent-events/agent-events.service';
import { ProfileService } from '../profile/profile.service';
import { LlmService } from '../llm/llm.service';
import { evaluate, EvaluationResult, RuleResult } from '../rules/rules-engine';
import { Provenance, UserRole } from '@educaro/shared';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

const ExplanationSchema = z.object({
  explanation: z.string(),
  keyStrengths: z.array(z.string()).optional(),
  actionableNextSteps: z.array(z.string()).optional(),
});

export interface QualificationResponse {
  pathway: string;
  status: 'ELIGIBLE' | 'PARTIAL' | 'NOT_YET';
  scorePct: number;
  passed: RuleResult[];
  missing: RuleResult[];
  explanation: string;
  recommendedService: {
    title: string;
    description: string;
    consultantReferral: string;
    applicantAction: string;
    actionRoute: string;
  };
}

@Injectable()
export class QualificationService {
  private readonly logger = new Logger(QualificationService.name);
  private serviceRoutes: Record<string, Record<string, any>> = {};

  constructor(
    private readonly db: DatabaseService,
    private readonly eventsService: AgentEventsService,
    private readonly profileService: ProfileService,
    private readonly llmService: LlmService,
  ) {
    this.loadServiceRoutes();
  }

  private loadServiceRoutes() {
    const possiblePaths = [
      path.resolve(__dirname, 'service-routes.json'),
      path.resolve(__dirname, '..', 'src', 'qualification', 'service-routes.json'),
      path.resolve(process.cwd(), 'src', 'qualification', 'service-routes.json'),
      path.resolve(process.cwd(), 'apps', 'api', 'src', 'qualification', 'service-routes.json'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        this.serviceRoutes = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return;
      }
    }
  }

  /**
   * Deterministic Evaluation + JSON Router + LLM Explanation.
   * Hard Rule 2: Eligibility logic is deterministic code + JSON config. LLM only explains results.
   */
  async evaluateQualification(userId: string, pathwayOverride?: string): Promise<QualificationResponse> {
    const startTime = Date.now();

    // 1. Fetch full profile
    const profile = await this.profileService.getProfile(userId);
    const fieldMap: Record<string, string> = {};
    for (const f of profile.fields) {
      if (f.value) fieldMap[f.fieldKey] = f.value;
    }

    const pathway = (pathwayOverride || fieldMap['targetPathway'] || 'STUDY').toUpperCase();

    // 2. Pure deterministic evaluation
    const evalResult: EvaluationResult = evaluate(fieldMap, pathway);

    // 3. Router mapping from service-routes.json
    const pathwayRoutes = this.serviceRoutes[evalResult.pathway] || this.serviceRoutes['STUDY'] || {};
    const routeConfig = pathwayRoutes[evalResult.status] || {
      serviceTitle: 'Educaro Germany Consultation',
      serviceDescription: '1-on-1 strategy session with an Educaro expert.',
      consultantReferral: 'Senior Admissions Advisor',
      applicantAction: 'Review profile checklist and prepare documents.',
      actionRoute: '/journey/next-steps',
    };

    // 4. LLM writes plain-language explanation citing passed/failed rules
    const passedNames = evalResult.passed.map(p => `• ${p.name} (Actual: ${p.actualValue || 'verified'})`).join('\n');
    const missingNames = evalResult.missing.map(m => `• ${m.name} (Need: ${m.expectedValue})`).join('\n');

    const prompt = `Pathway: ${evalResult.pathway}
Status: ${evalResult.status} (Score: ${evalResult.scorePct}%)
Passed Criteria:
${passedNames || 'None'}

Missing / Pending Criteria:
${missingNames || 'None'}

Write a transparent 3-4 sentence explanation for the applicant.
Cite specifically which rules passed and which are missing or pending.
Do not invent facts or promise guaranteed visas.`;

    const fallbackExplanation = evalResult.status === 'ELIGIBLE'
      ? `Congratulations! Based on deterministic evaluation against German ${evalResult.pathway} criteria, you meet the primary statutory requirements including your ${evalResult.passed.map(p => p.name).join(', ')}. Educaro will now assist you with official APS verification and submission.`
      : evalResult.status === 'PARTIAL'
        ? `You have a promising profile and have already satisfied ${evalResult.passed.length} key criteria (${evalResult.passed.map(p => p.name).join(', ')}). To become fully eligible, you need to fulfill: ${evalResult.missing.map(m => m.name).join(', ')}. Check out our recommended next steps below.`
        : `Your profile currently has pending requirements before qualifying for the ${evalResult.pathway} route. In particular: ${evalResult.missing.map(m => m.name).join(', ')}. We recommend booking an Educaro advisor session to build an actionable bridge roadmap.`;

    let explanationText = fallbackExplanation;
    try {
      const llmResult = await this.llmService.chatJson(
        prompt,
        ExplanationSchema,
        { explanation: fallbackExplanation },
        {
          userId,
          agent: 'QualificationExplainer',
          tool: 'explainEvaluation',
          reason: `Explain ${evalResult.status} result for ${evalResult.pathway}`,
        }
      );
      if (llmResult?.explanation) {
        explanationText = llmResult.explanation;
      }
    } catch (err: any) {
      this.logger.warn(`LLM explanation failed, used deterministic fallback: ${err.message}`);
    }

    // 5. Store evaluation results in profile_fields
    const actor = { userId, role: UserRole.APPLICANT, isAi: true };
    await this.profileService.upsertField(actor, {
      category: 'qualification',
      fieldKey: 'qualificationStatus',
      value: evalResult.status,
      provenance: Provenance.AI_GENERATED,
      confidence: 1.0,
      sourceSnippet: `Deterministic evaluation: ${evalResult.passed.length} passed, ${evalResult.missing.length} missing`,
    });
    await this.profileService.upsertField(actor, {
      category: 'qualification',
      fieldKey: 'qualificationEvaluated',
      value: 'true',
      provenance: Provenance.AI_GENERATED,
      confidence: 1.0,
    });
    await this.profileService.upsertField(actor, {
      category: 'recommendedJourney',
      fieldKey: 'recommendedService',
      value: routeConfig.serviceTitle,
      provenance: Provenance.AI_GENERATED,
      confidence: 1.0,
    });

    const durationMs = Date.now() - startTime;
    await this.eventsService.logEvent({
      userId,
      agent: 'QualificationAgent',
      tool: 'DeterministicRulesEngine',
      reason: `Evaluated ${evalResult.pathway} pathway: Status ${evalResult.status} (${evalResult.scorePct}%)`,
      input: { pathway: evalResult.pathway, rulesCount: evalResult.passed.length + evalResult.missing.length },
      output: { status: evalResult.status, passedCount: evalResult.passed.length, missingCount: evalResult.missing.length, explanation: explanationText },
      confidence: 1.0,
      durationMs,
    });

    return {
      pathway: evalResult.pathway,
      status: evalResult.status,
      scorePct: evalResult.scorePct,
      passed: evalResult.passed,
      missing: evalResult.missing,
      explanation: explanationText,
      recommendedService: {
        title: routeConfig.serviceTitle,
        description: routeConfig.serviceDescription,
        consultantReferral: routeConfig.consultantReferral,
        applicantAction: routeConfig.applicantAction,
        actionRoute: routeConfig.actionRoute,
      },
    };
  }

  async getLearningPath(userId: string) {
    const profile = await this.profileService.getProfile(userId);
    const germanLevel = (profile.personal['germanLevel']?.value || profile.languages['germanLevel']?.value || 'A1').toUpperCase();
    return {
      currentLevel: germanLevel,
      targetLevel: 'B2',
      estimatedWeeks: 16,
      modules: [
        { level: 'A1', title: 'A1 Foundations (DW Nicos Weg)', status: 'COMPLETED' },
        { level: 'A2', title: 'A2 Conversational & Grammar', status: 'IN_PROGRESS' },
        { level: 'B1', title: 'B1 Goethe Certificate Preparation', status: 'UPCOMING' },
        { level: 'B2', title: 'B2 Academic & Workplace German', status: 'UPCOMING' },
      ],
    };
  }

  async simulateWhatIf(userId: string, criteria: any) {
    const profile = await this.profileService.getProfile(userId);
    const simulatedMap: Record<string, string> = {};
    for (const f of profile.fields) {
      if (f.value) simulatedMap[f.fieldKey] = f.value;
    }
    if (criteria.germanLevel) simulatedMap['germanLevel'] = criteria.germanLevel;
    if (criteria.yearsOfExperience) simulatedMap['yearsOfExperience'] = String(criteria.yearsOfExperience);
    if (criteria.highestDegree) simulatedMap['degreeName'] = criteria.highestDegree;

    const evalResult = evaluate(simulatedMap, criteria.pathway || simulatedMap['targetPathway'] || 'STUDY');
    return {
      simulatedResult: evalResult,
      improvements: evalResult.passed.map(p => p.name),
    };
  }
}
