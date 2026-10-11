import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AgentEventsService } from '../agent-events/agent-events.service';
import { Provenance, UserRole, ProfileFieldRecord, UpsertFieldDto, Pathway, CEFRLevel } from '@educaro/shared';
import * as crypto from 'crypto';

export interface ActorContext {
  userId: string;
  role: UserRole;
  isAi?: boolean;
}

export interface StructuredProfile {
  personal: Record<string, any>;
  education: Record<string, any>;
  employment: Record<string, any>;
  skills: Record<string, any>;
  languages: Record<string, any>;
  documents: Record<string, any>;
  motivation: Record<string, any>;
  media: Record<string, any>;
  qualification: Record<string, any>;
  recommendedJourney: Record<string, any>;
  fields: ProfileFieldRecord[];
  completenessScore: number;
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly eventsService: AgentEventsService,
  ) {}

  /**
   * Enforces Hard Rule 1:
   * "Every profile field must carry a provenance label (VERIFIED / APPLICANT_PROVIDED / AI_EXTRACTED / AI_GENERATED).
   * The AI-writing path must never be able to set VERIFIED."
   */
  async upsertField(actor: ActorContext, dto: UpsertFieldDto): Promise<ProfileFieldRecord> {
    const startTime = Date.now();

    // 1. HARD RULE 1 CHECK: AI writing path cannot set VERIFIED
    if (actor.isAi && dto.provenance === Provenance.VERIFIED) {
      this.logger.error(`Security breach attempt: AI path tried to assign VERIFIED to field '${dto.fieldKey}'`);
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Security Violation (Hard Rule 1): AI agent writing paths are forbidden from setting VERIFIED provenance.',
        field: dto.fieldKey,
        attemptedProvenance: dto.provenance,
      });
    }

    // 2. APPLICANT SELF-EDIT CHECK: An applicant cannot mark their own fields as VERIFIED directly
    let finalProvenance = dto.provenance;
    if (!actor.isAi && actor.role === UserRole.APPLICANT) {
      if (dto.provenance === Provenance.VERIFIED) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Applicants cannot mark their own fields as VERIFIED. Verification requires official checks or consultant sign-off.',
        });
      }
      finalProvenance = Provenance.APPLICANT_PROVIDED;
    }

    // Default provenance fallback if not specified
    if (!finalProvenance) {
      finalProvenance = actor.isAi ? Provenance.AI_EXTRACTED : Provenance.APPLICANT_PROVIDED;
    }

    // 3. Upsert into database
    const updatedAt = new Date().toISOString();
    const id = crypto.randomUUID();

    const existing = await this.db.query(
      'SELECT id, value, provenance FROM profile_fields WHERE user_id = $1 AND field_key = $2',
      [actor.userId, dto.fieldKey]
    );

    let resultRecord: ProfileFieldRecord;

    if (existing.rows.length > 0) {
      const res = await this.db.query(
        `UPDATE profile_fields
         SET value = $1, provenance = $2, confidence = $3, source_document_id = $4,
             source_snippet = $5, updated_at = $6
         WHERE user_id = $7 AND field_key = $8
         RETURNING *`,
        [
          dto.value,
          finalProvenance,
          dto.confidence ?? null,
          dto.sourceDocumentId ?? null,
          dto.sourceSnippet ?? null,
          updatedAt,
          actor.userId,
          dto.fieldKey,
        ]
      );
      const row = res.rows[0];
      resultRecord = {
        id: row.id,
        userId: row.user_id,
        category: row.category,
        fieldKey: row.field_key,
        value: row.value,
        provenance: row.provenance as Provenance,
        confidence: row.confidence,
        sourceDocumentId: row.source_document_id,
        sourceSnippet: row.source_snippet,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
      };
    } else {
      const res = await this.db.query(
        `INSERT INTO profile_fields
         (id, user_id, category, field_key, value, provenance, confidence, source_document_id, source_snippet, updated_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
         RETURNING *`,
        [
          id,
          actor.userId,
          dto.category || 'personal',
          dto.fieldKey,
          dto.value,
          finalProvenance,
          dto.confidence ?? null,
          dto.sourceDocumentId ?? null,
          dto.sourceSnippet ?? null,
          updatedAt,
        ]
      );
      const row = res.rows[0];
      resultRecord = {
        id: row.id,
        userId: row.user_id,
        category: row.category,
        fieldKey: row.field_key,
        value: row.value,
        provenance: row.provenance as Provenance,
        confidence: row.confidence,
        sourceDocumentId: row.source_document_id,
        sourceSnippet: row.source_snippet,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
      };
    }

    // 4. Update applicant completeness score
    await this.recalculateCompleteness(actor.userId);

    // 5. Hard Rule 3: Log agent action if called from AI path
    if (actor.isAi) {
      await this.eventsService.logEvent({
        userId: actor.userId,
        agent: 'ProfileAgent',
        tool: 'upsertField',
        reason: `Upserted profile field ${dto.fieldKey} (${finalProvenance})`,
        input: dto,
        output: { fieldKey: resultRecord.fieldKey, provenance: resultRecord.provenance },
        confidence: dto.confidence,
        durationMs: Date.now() - startTime,
      });
    }

    return resultRecord;
  }

  async deleteField(userId: string, fieldKey: string) {
    await this.db.query(
      'DELETE FROM profile_fields WHERE user_id = $1 AND field_key = $2',
      [userId, fieldKey]
    );
    await this.recalculateCompleteness(userId);
    return { success: true, deleted: fieldKey };
  }

  async getProfile(userId: string): Promise<StructuredProfile> {
    const res = await this.db.query(
      'SELECT * FROM profile_fields WHERE user_id = $1 ORDER BY category, field_key',
      [userId]
    );

    const fields: ProfileFieldRecord[] = res.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      category: row.category,
      fieldKey: row.field_key,
      value: row.value,
      provenance: row.provenance as Provenance,
      confidence: row.confidence,
      sourceDocumentId: row.source_document_id,
      sourceSnippet: row.source_snippet,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    }));

    // Group into 10 structured entities
    const structured: Record<string, Record<string, any>> = {
      personal: {},
      education: {},
      employment: {},
      skills: {},
      languages: {},
      documents: {},
      motivation: {},
      media: {},
      qualification: {},
      recommendedJourney: {},
    };

    for (const f of fields) {
      const cat = f.category.toLowerCase();
      const targetCat = structured[cat] ? cat : 'personal';
      structured[targetCat][f.fieldKey] = {
        value: f.value,
        provenance: f.provenance,
        confidence: f.confidence,
        sourceDocumentId: f.sourceDocumentId,
        sourceSnippet: f.sourceSnippet,
        updatedAt: f.updatedAt,
      };
    }

    const completenessScore = this.computeScore(fields);

    return {
      personal: structured.personal,
      education: structured.education,
      employment: structured.employment,
      skills: structured.skills,
      languages: structured.languages,
      documents: structured.documents,
      motivation: structured.motivation,
      media: structured.media,
      qualification: structured.qualification,
      recommendedJourney: structured.recommendedJourney,
      fields,
      completenessScore,
    };
  }

  async getCategoryFields(userId: string, category: string): Promise<ProfileFieldRecord[]> {
    const res = await this.db.query(
      'SELECT * FROM profile_fields WHERE user_id = $1 AND LOWER(category) = LOWER($2) ORDER BY field_key',
      [userId, category]
    );

    return res.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      category: row.category,
      fieldKey: row.field_key,
      value: row.value,
      provenance: row.provenance as Provenance,
      confidence: row.confidence,
      sourceDocumentId: row.source_document_id,
      sourceSnippet: row.source_snippet,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    }));
  }

  async saveCandidateDetails(
    userId: string,
    data: {
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
    const actor = { userId, role: UserRole.APPLICANT, isAi: false };
    const savedFields: ProfileFieldRecord[] = [];

    if (data.fullName) {
      savedFields.push(
        await this.upsertField(actor, {
          category: 'personal',
          fieldKey: 'fullName',
          value: data.fullName,
          provenance: Provenance.APPLICANT_PROVIDED,
        })
      );
    }
    if (data.email) {
      savedFields.push(
        await this.upsertField(actor, {
          category: 'personal',
          fieldKey: 'email',
          value: data.email,
          provenance: Provenance.APPLICANT_PROVIDED,
        })
      );
    }
    if (data.phone) {
      savedFields.push(
        await this.upsertField(actor, {
          category: 'personal',
          fieldKey: 'phone',
          value: data.phone,
          provenance: Provenance.APPLICANT_PROVIDED,
        })
      );
    }
    if (data.age) {
      savedFields.push(
        await this.upsertField(actor, {
          category: 'personal',
          fieldKey: 'age',
          value: String(data.age),
          provenance: Provenance.APPLICANT_PROVIDED,
        })
      );
    }
    if (data.country) {
      savedFields.push(
        await this.upsertField(actor, {
          category: 'personal',
          fieldKey: 'country',
          value: data.country,
          provenance: Provenance.APPLICANT_PROVIDED,
        })
      );
      await this.upsertField(actor, {
        category: 'personal',
        fieldKey: 'currentLocation',
        value: data.country,
        provenance: Provenance.APPLICANT_PROVIDED,
      });
    }

    if (data.targetPathway) {
      savedFields.push(
        await this.upsertField(actor, {
          category: 'personal',
          fieldKey: 'targetPathway',
          value: data.targetPathway,
          provenance: Provenance.APPLICANT_PROVIDED,
        })
      );
    }

    if (data.germanLevel) {
      savedFields.push(
        await this.upsertField(actor, {
          category: 'languages',
          fieldKey: 'germanLevel',
          value: data.germanLevel,
          provenance: Provenance.APPLICANT_PROVIDED,
        })
      );
    }
    if (data.englishLevel) {
      savedFields.push(
        await this.upsertField(actor, {
          category: 'languages',
          fieldKey: 'englishLevel',
          value: data.englishLevel,
          provenance: Provenance.APPLICANT_PROVIDED,
        })
      );
    }

    // Sync into applicants table
    await this.db.query(
      `UPDATE applicants
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           location = COALESCE($4, location)
       WHERE user_id = $5`,
      [data.fullName || null, data.email || null, data.phone || null, data.country || null, userId]
    );

    await this.eventsService.logEvent({
      userId,
      agent: 'IntakeAgent',
      tool: 'CandidateDetailsForm',
      reason: 'Captured applicant details (APPLICANT_PROVIDED)',
      input: data,
      output: { savedCount: savedFields.length },
      confidence: 1.0,
      durationMs: 20,
    });

    return { success: true, savedFields };
  }

  /**
   * Deterministic completeness calculation computed purely in code.
   * Checks key requirements across the 10 entities.
   */
  public computeScore(fields: ProfileFieldRecord[]): number {
    const hasValue = (key: string) => {
      const f = fields.find((item) => item.fieldKey.toLowerCase() === key.toLowerCase());
      return f && f.value && f.value.trim().length > 0;
    };

    let score = 0;

    // Personal details (20%)
    if (hasValue('fullName')) score += 5;
    if (hasValue('email')) score += 5;
    if (hasValue('phone')) score += 5;
    if (hasValue('country') || hasValue('currentLocation')) score += 5;

    // Education details (25%)
    if (hasValue('degreeName') || hasValue('highestDegree')) score += 10;
    if (hasValue('institution')) score += 5;
    if (hasValue('graduationDate')) score += 5;
    if (hasValue('fieldOfStudy')) score += 5;

    // Employment details (20%)
    if (hasValue('employer') || hasValue('currentRole')) score += 10;
    if (hasValue('yearsOfExperience')) score += 10;

    // Languages (15%)
    if (hasValue('germanLevel')) score += 10;
    if (hasValue('englishLevel')) score += 5;

    // Motivation / Goals (10%)
    if (hasValue('motivation') || hasValue('goals') || hasValue('targetPathway')) score += 10;

    // Documents / Passport / Media (10%)
    if (hasValue('passportNumber') || hasValue('videoTranscript') || fields.some(f => f.sourceDocumentId)) score += 10;

    return Math.min(100, score);
  }

  private async recalculateCompleteness(userId: string) {
    const res = await this.db.query(
      'SELECT field_key, value FROM profile_fields WHERE user_id = $1',
      [userId]
    );
    const score = this.computeScore(
      res.rows.map((r: any) => ({ fieldKey: r.field_key, value: r.value } as any))
    );
    await this.db.query(
      'UPDATE applicants SET completeness_pct = $1 WHERE user_id = $2',
      [score, userId]
    );
  }
}
