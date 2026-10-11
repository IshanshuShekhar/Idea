import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AgentEventsService } from '../agent-events/agent-events.service';
import { ProfileService } from '../profile/profile.service';
import { LlmService } from '../llm/llm.service';
import { ConsistencyService } from '../consistency/consistency.service';
import { evaluate } from '../rules/rules-engine';
import { JourneyState, Provenance, UserRole } from '@educaro/shared';
import { z } from 'zod';

export type OrchestrationStep =
  | 'ASK_GOAL'
  | 'ASK_FIELD'
  | 'REQUEST_DOCUMENT'
  | 'VALIDATE'
  | 'QUALIFY'
  | 'ROUTE';

export interface NextStepDecision {
  step: OrchestrationStep;
  reason: string;
  missingField?: string;
  actionRoute: string;
  suggestedPrompt: string;
}

const ChatIntakeResponseSchema = z.object({
  reply: z.string(),
  extractedFields: z.record(z.string().nullable().optional()),
  quickReplies: z.array(z.string()).optional(),
});

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly eventsService: AgentEventsService,
    private readonly profileService: ProfileService,
    private readonly llmService: LlmService,
    private readonly consistencyService: ConsistencyService,
  ) {}

  /**
   * Deterministic step decision:
   * Plain NestJS logic, NOT LLM-driven.
   * Reads profile, finds missing/low-confidence fields, picks next step:
   * ask goal -> ask field -> request document -> validate -> qualify -> route.
   */
  async determineNextStep(userId: string): Promise<NextStepDecision> {
    const profile = await this.profileService.getProfile(userId);
    const fieldMap: Record<string, string> = {};
    for (const f of profile.fields) {
      if (f.value && f.value.trim().length > 0) {
        fieldMap[f.fieldKey] = f.value;
      }
    }

    // Check inconsistencies
    const incRes = await this.db.query(
      'SELECT id FROM inconsistencies WHERE user_id = $1 AND is_resolved = FALSE',
      [userId]
    );
    const hasInconsistency = incRes.rows.length > 0;

    // Check documents
    const docRes = await this.db.query(
      'SELECT document_type FROM documents WHERE user_id = $1',
      [userId]
    );
    const uploadedDocs = new Set(docRes.rows.map((r: any) => r.document_type));

    // Decision 1: Ask Goal
    if (!fieldMap['targetPathway']) {
      return {
        step: 'ASK_GOAL',
        reason: 'Target immigration pathway is missing. Need to establish if applicant targets University Study or EU Blue Card.',
        missingField: 'targetPathway',
        actionRoute: '/journey/goal',
        suggestedPrompt: 'Are you targeting University Study (Bachelor/Master) or an EU Blue Card (Skilled Employment) in Germany?',
      };
    }

    // Decision 2: Ask Core Personal Fields
    if (!fieldMap['fullName']) {
      return {
        step: 'ASK_FIELD',
        reason: 'Applicant full legal name is missing.',
        missingField: 'fullName',
        actionRoute: '/journey/chat',
        suggestedPrompt: 'Could you share your full legal name as it appears on your passport or degree?',
      };
    }
    if (!fieldMap['currentLocation'] && !fieldMap['country']) {
      return {
        step: 'ASK_FIELD',
        reason: 'Current location is missing.',
        missingField: 'currentLocation',
        actionRoute: '/journey/chat',
        suggestedPrompt: 'Which city and state in India are you currently located in?',
      };
    }

    // Decision 3: Ask Qualification / Language / Experience Fields
    if (!fieldMap['degreeName'] && !fieldMap['highestDegree']) {
      return {
        step: 'ASK_FIELD',
        reason: 'Highest academic degree is missing.',
        missingField: 'degreeName',
        actionRoute: '/journey/chat',
        suggestedPrompt: 'What is your highest degree completed or currently in progress (e.g. B.Tech Computer Science)?',
      };
    }
    if (!fieldMap['germanLevel']) {
      return {
        step: 'ASK_FIELD',
        reason: 'German language proficiency is missing.',
        missingField: 'germanLevel',
        actionRoute: '/journey/chat',
        suggestedPrompt: 'What is your current German CEFR level (e.g., A1, A2, B1, B2, or complete beginner)?',
      };
    }

    // Decision 4: Request Documents
    const hasDegree = uploadedDocs.has('DEGREE_CERTIFICATE') || uploadedDocs.has('CV');
    if (!hasDegree) {
      return {
        step: 'REQUEST_DOCUMENT',
        reason: 'Degree certificate or CV is needed for official AI extraction and Anabin verification.',
        missingField: 'DEGREE_CERTIFICATE',
        actionRoute: '/journey/documents',
        suggestedPrompt: 'Please upload your degree certificate or CV so our AI can extract and verify your academic details.',
      };
    }

    // Decision 5: Validate / Resolve Conflicts
    if (hasInconsistency) {
      return {
        step: 'VALIDATE',
        reason: 'Detected discrepancy across documents or timeline that must be clarified before final qualification.',
        actionRoute: '/journey/documents',
        suggestedPrompt: 'We detected a timeline/data difference. Please review and clarify the flagged fields.',
      };
    }

    // Decision 6: Qualify
    const pathway = fieldMap['targetPathway'] || 'STUDY';
    const evalResult = evaluate(fieldMap, pathway);
    if (!fieldMap['qualificationEvaluated']) {
      return {
        step: 'QUALIFY',
        reason: 'Profile data is ready for official pathway eligibility evaluation against deterministic rules.',
        actionRoute: '/journey/qualification',
        suggestedPrompt: `Your profile is ready for evaluation against German ${pathway} regulations.`,
      };
    }

    // Decision 7: Route to Next Step
    return {
      step: 'ROUTE',
      reason: 'Applicant is qualified. Route to recommended Educaro service and printable CV.',
      actionRoute: '/journey/next-steps',
      suggestedPrompt: 'View your customized German relocation checklist, printable Lebenslauf CV, and advisor referral.',
    };
  }

  /**
   * Chat endpoint: Uses LlmService to phrase the question naturally
   * and parse the applicant's response into structured JSON fields.
   * Hard Rule 1: Every extracted fact is stored as APPLICANT_PROVIDED.
   * Logs every decision to agent_events.
   */
  async processChat(userId: string, message: string, history: any[] = []) {
    const startTime = Date.now();
    const decisionBefore = await this.determineNextStep(userId);

    const prompt = `Current missing/needed field: ${decisionBefore.missingField || 'general clarification'}
Applicant input: "${message}"

Task:
1. Extract any concrete applicant details mentioned (e.g. fullName, targetPathway, degreeName, graduationDate, fieldOfStudy, germanLevel, englishLevel, yearsOfExperience, currentLocation) into extractedFields.
2. Formulate a warm, helpful conversational reply addressing the user and prompting for any remaining details.
3. Provide 2-3 quick reply button suggestions.`;

    const fallback = {
      reply: `Thank you! I have recorded: "${message}". What other details would you like to update?`,
      extractedFields: {},
      quickReplies: ['Continue to Document Upload', 'View My Profile', 'Ask a Question'],
    };

    const chatResponse = await this.llmService.chatJson(
      prompt,
      ChatIntakeResponseSchema,
      fallback,
      {
        userId,
        agent: 'OrchestratorAgent',
        tool: 'processChat',
        reason: `Process applicant message and extract structured facts for step ${decisionBefore.step}`,
      }
    );

    // Save parsed fields into profile as APPLICANT_PROVIDED
    const actor = { userId, role: UserRole.APPLICANT, isAi: false };
    const savedKeys: string[] = [];

    if (chatResponse.extractedFields && typeof chatResponse.extractedFields === 'object') {
      for (const [key, val] of Object.entries(chatResponse.extractedFields)) {
        if (val && typeof val === 'string' && val.trim().length > 0) {
          let category = 'personal';
          if (['degreeName', 'institution', 'graduationDate', 'fieldOfStudy', 'gradeOrGpa'].includes(key)) {
            category = 'education';
          } else if (['employer', 'role', 'startDate', 'endDate', 'yearsOfExperience'].includes(key)) {
            category = 'employment';
          } else if (['germanLevel', 'englishLevel'].includes(key)) {
            category = 'languages';
          } else if (['motivation', 'goals'].includes(key)) {
            category = 'motivation';
          }

          await this.profileService.upsertField(actor, {
            category,
            fieldKey: key,
            value: val.trim(),
            provenance: Provenance.APPLICANT_PROVIDED,
            confidence: 1.0,
            sourceSnippet: `Applicant chat input: "${message}"`,
          });
          savedKeys.push(key);
        }
      }
    }

    const decisionAfter = await this.determineNextStep(userId);
    const durationMs = Date.now() - startTime;

    await this.eventsService.logEvent({
      userId,
      agent: 'OrchestratorAgent',
      tool: 'IntakeRouter',
      reason: `Processed applicant chat input. Decision: ${decisionAfter.step} (${decisionAfter.reason})`,
      input: { message, extractedFieldsCount: savedKeys.length },
      output: { reply: chatResponse.reply, nextStep: decisionAfter.step, savedKeys },
      confidence: 1.0,
      durationMs,
    });

    return {
      reply: chatResponse.reply,
      quickReplies: chatResponse.quickReplies || [],
      extractedFields: chatResponse.extractedFields || {},
      savedKeys,
      decision: decisionAfter,
    };
  }

  async getJourneyState(userId: string): Promise<JourneyState> {
    const profile = await this.profileService.getProfile(userId);
    const decision = await this.determineNextStep(userId);
    const fieldMap: Record<string, string> = {};
    for (const f of profile.fields) {
      if (f.value) fieldMap[f.fieldKey] = f.value;
    }

    const docRes = await this.db.query('SELECT document_type FROM documents WHERE user_id = $1', [userId]);
    const hasDocUpload = docRes.rows.length > 0;
    const hasEducation = Boolean(fieldMap['degreeName'] || fieldMap['highestDegree']);
    const hasGoal = Boolean(fieldMap['targetPathway']);

    return {
      currentStep: (decision.step as any) || 'PROFILE_CHAT',
      completedSteps: [
        ...(hasGoal ? ['GOAL_INTAKE' as const] : []),
        ...(hasEducation ? ['PROFILE_CHAT' as const] : []),
        ...(hasDocUpload ? ['DOCUMENTS' as const] : []),
      ],
      selectedPathway: (fieldMap['targetPathway'] as any) || 'STUDY',
      profileCompletenessPct: profile.completenessScore,
      nextBestAction: {
        title: decision.step.replace('_', ' '),
        description: decision.reason,
        targetRoute: decision.actionRoute,
        ctaLabel: 'Continue →',
      },
    };
  }

  async getConsolidatedCandidateDetails(userId: string) {
    const profile = await this.profileService.getProfile(userId);
    const userRes = await this.db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const appRes = await this.db.query('SELECT * FROM applicants WHERE user_id = $1', [userId]);
    const docsRes = await this.db.query('SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    const videoRes = await this.db.query('SELECT * FROM video_intros WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
    const incRes = await this.db.query('SELECT * FROM inconsistencies WHERE user_id = $1', [userId]);

    return {
      user: userRes.rows[0] || null,
      applicant: appRes.rows[0] || null,
      fields: profile.fields,
      structured: profile,
      completenessScore: profile.completenessScore,
      documents: docsRes.rows.map((d: any) => ({
        ...d,
        extracted_data: JSON.parse(d.extracted_data || '[]'),
      })),
      video: videoRes.rows[0] || null,
      inconsistencies: incRes.rows.map((i: any) => ({
        ...i,
        source_a_json: JSON.parse(i.source_a_json || '{}'),
        source_b_json: JSON.parse(i.source_b_json || '{}'),
      })),
      premiumStatus: {
        isActive: true,
        daysRemaining: 90,
      },
    };
  }
}
