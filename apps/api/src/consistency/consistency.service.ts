import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AgentEventsService } from '../agent-events/agent-events.service';
import { ProfileService } from '../profile/profile.service';
import { LlmService } from '../llm/llm.service';
import { DiscrepancyItem, InconsistencyReport, ResolveInconsistencyDto, Provenance, UserRole } from '@educaro/shared';
import * as crypto from 'crypto';
import { z } from 'zod';

const QuestionPhrasingSchema = z.object({
  clarifyingQuestion: z.string(),
  suggestedOptions: z.array(z.string()),
});

@Injectable()
export class ConsistencyService {
  private readonly logger = new Logger(ConsistencyService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly eventsService: AgentEventsService,
    private readonly profileService: ProfileService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * Deterministic Validator:
   * 1. Graduation vs employment date overlap (experience start date before graduation)
   * 2. Name mismatch across documents
   * 3. Missing required fields
   * 4. Old language certificate (> 2 years old)
   *
   * LLM words the clarifying question only. Never invents data.
   */
  async checkInconsistencies(userId: string): Promise<InconsistencyReport> {
    const startTime = Date.now();

    // 1. Fetch existing unresolved inconsistencies from DB
    const existingRows = await this.db.query(
      'SELECT * FROM inconsistencies WHERE user_id = $1 AND is_resolved = FALSE',
      [userId]
    );

    if (existingRows.rows.length > 0) {
      const discrepancies: DiscrepancyItem[] = existingRows.rows.map((r: any) => ({
        id: r.id,
        fieldKey: r.field_key,
        fieldLabel: r.field_label,
        sourceA: JSON.parse(r.source_a_json),
        sourceB: JSON.parse(r.source_b_json),
        clarifyingQuestion: r.clarifying_question,
        suggestedOptions: JSON.parse(r.suggested_options_json),
        severity: r.severity,
        isResolved: r.is_resolved,
        resolvedValue: r.resolved_value,
      }));

      return { hasInconsistency: true, discrepancies };
    }

    // 2. Fetch profile fields and documents
    const fieldsRes = await this.db.query(
      'SELECT * FROM profile_fields WHERE user_id = $1',
      [userId]
    );
    const fields = fieldsRes.rows;
    const fieldMap: Record<string, string> = {};
    for (const f of fields) {
      fieldMap[f.field_key] = f.value;
    }

    const docsRes = await this.db.query(
      'SELECT * FROM documents WHERE user_id = $1',
      [userId]
    );
    const docs = docsRes.rows;

    const discrepancies: DiscrepancyItem[] = [];

    // --- CHECK 1: Graduation vs employment date overlap ---
    const gradYearOrDate = fieldMap['graduationDate'] || fieldMap['graduationYear'];
    const empStartDate = fieldMap['startDate'];

    if (gradYearOrDate && empStartDate) {
      const gradYearMatch = gradYearOrDate.match(/\d{4}/);
      const empYearMatch = empStartDate.match(/\d{4}/);
      if (gradYearMatch && empYearMatch) {
        const gradYear = parseInt(gradYearMatch[0], 10);
        const empYear = parseInt(empYearMatch[0], 10);

        if (empYear < gradYear) {
          const conflictId = crypto.randomUUID();
          const defaultQuestion = `We detected a date conflict: Your employment start date (${empStartDate}) is before your recorded graduation date (${gradYearOrDate}). Was this an internship during college, or did your graduation date differ?`;
          const defaultOptions = [
            `Internship while studying (Graduation remained ${gradYearOrDate})`,
            `Graduation completed earlier in ${empYear}`,
            `Employment start date was actually after graduation`,
          ];

          let wordedQuestion = defaultQuestion;
          let wordedOptions = defaultOptions;

          try {
            const prompt = `Applicant employment start date is "${empStartDate}", but graduation date is "${gradYearOrDate}".
Phrase a polite, professional clarifying question for the applicant and 2-3 selectable option answers.`;
            const llmPhrased = await this.llmService.chatJson(
              prompt,
              QuestionPhrasingSchema,
              { clarifyingQuestion: defaultQuestion, suggestedOptions: defaultOptions },
              { userId, agent: 'Validator', tool: 'phraseDateOverlapQuestion' }
            );
            if (llmPhrased?.clarifyingQuestion) {
              wordedQuestion = llmPhrased.clarifyingQuestion;
              wordedOptions = llmPhrased.suggestedOptions || defaultOptions;
            }
          } catch {
            // Keep deterministic fallback
          }

          const item: DiscrepancyItem = {
            id: conflictId,
            fieldKey: 'startDate',
            fieldLabel: 'Graduation vs Employment Date Overlap',
            sourceA: {
              sourceType: 'DOCUMENT',
              sourceName: 'Experience Letter',
              value: empStartDate,
            },
            sourceB: {
              sourceType: 'DOCUMENT',
              sourceName: 'Degree Certificate',
              value: gradYearOrDate,
            },
            clarifyingQuestion: wordedQuestion,
            suggestedOptions: wordedOptions,
            severity: 'CRITICAL',
            isResolved: false,
          };

          await this.saveInconsistency(userId, item);
          discrepancies.push(item);
        }
      }
    }

    // --- CHECK 2: Name mismatch across documents ---
    const profileName = fieldMap['fullName'];
    let docName: string | null = null;
    let docNameSource = '';

    for (const d of docs) {
      try {
        const extracted = JSON.parse(d.extracted_data || '[]');
        const nameField = extracted.find((e: any) => e.key === 'fullName');
        if (nameField && nameField.value && nameField.value.trim().length > 0) {
          if (profileName && nameField.value.trim().toLowerCase() !== profileName.trim().toLowerCase()) {
            docName = nameField.value.trim();
            docNameSource = d.document_type;
            break;
          }
        }
      } catch {
        // ignore JSON parse
      }
    }

    if (profileName && docName && profileName.toLowerCase() !== docName.toLowerCase()) {
      const conflictId = crypto.randomUUID();
      const defaultQuestion = `Name mismatch detected: Profile lists "${profileName}", but your ${docNameSource} lists "${docName}". Which full legal name matches your passport?`;
      const item: DiscrepancyItem = {
        id: conflictId,
        fieldKey: 'fullName',
        fieldLabel: 'Applicant Legal Name Variation',
        sourceA: { sourceType: 'CHAT', sourceName: 'Profile Input', value: profileName },
        sourceB: { sourceType: 'DOCUMENT', sourceName: docNameSource, value: docName },
        clarifyingQuestion: defaultQuestion,
        suggestedOptions: [
          `${profileName} (Matches passport)`,
          `${docName} (Official degree/document format)`,
        ],
        severity: 'WARNING',
        isResolved: false,
      };

      await this.saveInconsistency(userId, item);
      discrepancies.push(item);
    }

    // --- CHECK 3: Old language certificate (> 2 years) ---
    const testDate = fieldMap['testDate'];
    if (testDate) {
      const testYearMatch = testDate.match(/\d{4}/);
      if (testYearMatch) {
        const testYear = parseInt(testYearMatch[0], 10);
        const currentYear = new Date().getFullYear();
        if (currentYear - testYear >= 2) {
          const conflictId = crypto.randomUUID();
          const item: DiscrepancyItem = {
            id: conflictId,
            fieldKey: 'testDate',
            fieldLabel: 'German Language Certificate Age',
            sourceA: { sourceType: 'DOCUMENT', sourceName: 'Language Certificate', value: testDate },
            sourceB: { sourceType: 'PROFILE', sourceName: 'German University Policy', value: 'Must be within 2 years' },
            clarifyingQuestion: `Your German language certificate date is ${testDate} (${currentYear - testYear} years ago). German universities and embassies generally require certificates issued within 2 years. Do you have an updated test or plan to re-certify?`,
            suggestedOptions: [
              'I plan to take the Goethe B2 exam before visa submission',
              'My target university accepts older certificates with MOI',
              'Certificate is still within valid period',
            ],
            severity: 'WARNING',
            isResolved: false,
          };

          await this.saveInconsistency(userId, item);
          discrepancies.push(item);
        }
      }
    }

    // --- CHECK 4: Missing required fields ---
    const targetPathway = fieldMap['targetPathway'];
    if (targetPathway && !fieldMap['highestDegree'] && !fieldMap['degreeName']) {
      // Missing academic degree
      const conflictId = crypto.randomUUID();
      const item: DiscrepancyItem = {
        id: conflictId,
        fieldKey: 'degreeName',
        fieldLabel: 'Missing Academic Degree Details',
        sourceA: { sourceType: 'PROFILE', sourceName: 'Profile Fields', value: 'Not provided' },
        sourceB: { sourceType: 'PROFILE', sourceName: 'Pathway Prerequisite', value: 'Bachelor or Master degree' },
        clarifyingQuestion: 'Your profile is missing academic degree details needed for APS/Anabin verification. What is your highest degree completed or in progress?',
        suggestedOptions: [
          'Bachelor of Technology / Engineering (B.Tech / B.E.)',
          'Bachelor of Science / Computer Applications (B.Sc / BCA)',
          'Master of Science / Technology (M.Sc / M.Tech)',
        ],
        severity: 'CRITICAL',
        isResolved: false,
      };

      await this.saveInconsistency(userId, item);
      discrepancies.push(item);
    }

    const durationMs = Date.now() - startTime;
    await this.eventsService.logEvent({
      userId,
      agent: 'ValidatorAgent',
      tool: 'DeterministicValidationEngine',
      reason: `Ran validator checks: ${discrepancies.length} discrepancies flagged`,
      input: { profileFieldsCount: fields.length, documentsCount: docs.length },
      output: { hasInconsistency: discrepancies.length > 0, count: discrepancies.length },
      confidence: 1.0,
      durationMs,
    });

    return {
      hasInconsistency: discrepancies.length > 0,
      discrepancies,
    };
  }

  private async saveInconsistency(userId: string, item: DiscrepancyItem) {
    await this.db.query(
      `INSERT INTO inconsistencies (id, user_id, field_key, field_label, source_a_json, source_b_json, clarifying_question, suggested_options_json, severity, is_resolved, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, CURRENT_TIMESTAMP)`,
      [
        item.id,
        userId,
        item.fieldKey,
        item.fieldLabel,
        JSON.stringify(item.sourceA),
        JSON.stringify(item.sourceB),
        item.clarifyingQuestion,
        JSON.stringify(item.suggestedOptions),
        item.severity,
      ]
    );
  }

  async resolveInconsistency(userId: string, dto: ResolveInconsistencyDto) {
    const startTime = Date.now();

    await this.db.query(
      `UPDATE inconsistencies
       SET is_resolved = TRUE, resolved_value = $1
       WHERE id = $2 AND user_id = $3`,
      [dto.resolvedValue, dto.discrepancyId, userId]
    );

    const incRes = await this.db.query('SELECT * FROM inconsistencies WHERE id = $1', [dto.discrepancyId]);
    const inc = incRes.rows[0];

    const actor = { userId, role: UserRole.APPLICANT, isAi: false };
    if (inc?.field_key) {
      await this.profileService.upsertField(actor, {
        category: 'personal',
        fieldKey: inc.field_key,
        value: dto.resolvedValue,
        provenance: Provenance.APPLICANT_PROVIDED,
        sourceSnippet: `Clarification provided by applicant: ${dto.resolutionNote || dto.resolvedValue}`,
      });
    }

    await this.eventsService.logEvent({
      userId,
      agent: 'ValidatorAgent',
      tool: 'DiscrepancyResolutionTool',
      reason: `Applicant resolved inconsistency for '${inc?.field_label || 'field'}' to '${dto.resolvedValue}'`,
      input: { discrepancyId: dto.discrepancyId, chosenValue: dto.resolvedValue },
      output: { status: 'RESOLVED', updatedProfileValue: dto.resolvedValue, provenance: Provenance.APPLICANT_PROVIDED },
      confidence: 1.0,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      resolvedValue: dto.resolvedValue,
      message: 'Inconsistency successfully resolved and profile updated as APPLICANT_PROVIDED.',
    };
  }
}
