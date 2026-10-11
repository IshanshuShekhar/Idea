import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProfileService } from '../profile/profile.service';
import { AgentEventsService } from '../agent-events/agent-events.service';
import { ConsistencyService } from '../consistency/consistency.service';
import { Provenance, UserRole } from '@educaro/shared';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly profileService: ProfileService,
    private readonly eventsService: AgentEventsService,
    private readonly consistencyService: ConsistencyService,
  ) {}

  /**
   * Seeds demo persona "Rahul Sharma":
   * - B.Tech CS 2021 (Graduation: 2021-06-30, CGPA 8.4)
   * - 3 years experience (Software Engineer at Infosys)
   * - German B1 (Goethe-Zertifikat)
   * - PLANTED INCONSISTENCY: Experience start date (2020-07-01) is before graduation date (2021-06-30)
   * - Seeded document extractions and live agent events
   */
  async seedRahulPersona(): Promise<{ success: boolean; userId: string; message: string }> {
    this.logger.log('Seeding demo persona: Rahul Sharma...');
    const email = 'rahul.sharma@example.com';
    let userId: string;

    // 1. Get or create user
    const existing = await this.db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
    } else {
      userId = crypto.randomUUID();
      const hash = await bcrypt.hash('password123', 10);
      await this.db.query(
        `INSERT INTO users (id, email, password_hash, role, consent_at, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, email, hash, UserRole.APPLICANT]
      );
    }

    // 2. Ensure applicant row exists
    const appRes = await this.db.query('SELECT id FROM applicants WHERE user_id = $1', [userId]);
    if (appRes.rows.length === 0) {
      await this.db.query(
        `INSERT INTO applicants (id, user_id, name, email, phone, location, goal, completeness_pct, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 85, CURRENT_TIMESTAMP)`,
        [
          crypto.randomUUID(),
          userId,
          'Rahul Sharma',
          email,
          '+91 98765 43210',
          'New Delhi, India',
          'BLUE_CARD',
        ]
      );
    } else {
      await this.db.query(
        `UPDATE applicants
         SET name = 'Rahul Sharma', email = $1, phone = '+91 98765 43210', location = 'New Delhi, India', goal = 'BLUE_CARD'
         WHERE user_id = $2`,
        [email, userId]
      );
    }

    // 3. Clean up prior seeded fields & inconsistencies to ensure clean demo state
    await this.db.query('DELETE FROM profile_fields WHERE user_id = $1', [userId]);
    await this.db.query('DELETE FROM inconsistencies WHERE user_id = $1', [userId]);
    await this.db.query('DELETE FROM documents WHERE user_id = $1', [userId]);

    const actor = { userId, role: UserRole.APPLICANT, isAi: false };
    const aiActor = { userId, role: UserRole.APPLICANT, isAi: true };

    const docDegreeId = crypto.randomUUID();
    const docGermanId = crypto.randomUUID();
    const docExpId = crypto.randomUUID();
    const docCvId = crypto.randomUUID();

    // 4. Seed Profile Fields with strict Provenance
    // Personal fields
    await this.profileService.upsertField(actor, {
      category: 'personal',
      fieldKey: 'fullName',
      value: 'Rahul Sharma',
      provenance: Provenance.APPLICANT_PROVIDED,
    });
    await this.profileService.upsertField(actor, {
      category: 'personal',
      fieldKey: 'email',
      value: email,
      provenance: Provenance.APPLICANT_PROVIDED,
    });
    await this.profileService.upsertField(actor, {
      category: 'personal',
      fieldKey: 'phone',
      value: '+91 98765 43210',
      provenance: Provenance.APPLICANT_PROVIDED,
    });
    await this.profileService.upsertField(actor, {
      category: 'personal',
      fieldKey: 'country',
      value: 'India',
      provenance: Provenance.APPLICANT_PROVIDED,
    });
    await this.profileService.upsertField(actor, {
      category: 'personal',
      fieldKey: 'targetPathway',
      value: 'BLUE_CARD',
      provenance: Provenance.APPLICANT_PROVIDED,
    });

    // Education fields (AI_EXTRACTED from degree certificate)
    await this.profileService.upsertField(aiActor, {
      category: 'education',
      fieldKey: 'degreeName',
      value: 'Bachelor of Technology in Computer Science and Engineering',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.96,
      sourceDocumentId: docDegreeId,
      sourceSnippet: 'Awarded Bachelor of Technology in Computer Science to Rahul Sharma',
    });
    await this.profileService.upsertField(aiActor, {
      category: 'education',
      fieldKey: 'highestDegree',
      value: 'Bachelor',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.98,
      sourceDocumentId: docDegreeId,
    });
    await this.profileService.upsertField(aiActor, {
      category: 'education',
      fieldKey: 'institution',
      value: 'Delhi Technological University',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.94,
      sourceDocumentId: docDegreeId,
    });
    await this.profileService.upsertField(aiActor, {
      category: 'education',
      fieldKey: 'fieldOfStudy',
      value: 'Computer Science',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.97,
      sourceDocumentId: docDegreeId,
    });
    await this.profileService.upsertField(aiActor, {
      category: 'education',
      fieldKey: 'graduationDate',
      value: '2021-06-30',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.95,
      sourceDocumentId: docDegreeId,
      sourceSnippet: 'Conferred in the month of June 2021',
    });
    await this.profileService.upsertField(aiActor, {
      category: 'education',
      fieldKey: 'graduationYear',
      value: '2021',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.95,
      sourceDocumentId: docDegreeId,
    });
    await this.profileService.upsertField(aiActor, {
      category: 'education',
      fieldKey: 'cgpa',
      value: '8.4 / 10.0',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.92,
      sourceDocumentId: docDegreeId,
    });

    // Languages (AI_EXTRACTED from Goethe B1 certificate)
    await this.profileService.upsertField(aiActor, {
      category: 'languages',
      fieldKey: 'germanLevel',
      value: 'B1',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.95,
      sourceDocumentId: docGermanId,
      sourceSnippet: 'Goethe-Zertifikat B1: Gesamtergebnis Gut (82/100)',
    });
    await this.profileService.upsertField(aiActor, {
      category: 'languages',
      fieldKey: 'germanCertificate',
      value: 'Goethe-Zertifikat B1',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.95,
      sourceDocumentId: docGermanId,
    });
    await this.profileService.upsertField(aiActor, {
      category: 'languages',
      fieldKey: 'certificateDate',
      value: '2023-08-15',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.90,
      sourceDocumentId: docGermanId,
    });
    await this.profileService.upsertField(actor, {
      category: 'languages',
      fieldKey: 'englishLevel',
      value: 'C1',
      provenance: Provenance.APPLICANT_PROVIDED,
    });

    // Employment (AI_EXTRACTED from experience letter)
    // *** PLANTED INCONSISTENCY ***: startDate is '2020-07-01' which precedes graduationDate '2021-06-30'
    await this.profileService.upsertField(aiActor, {
      category: 'employment',
      fieldKey: 'employer',
      value: 'Infosys Limited',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.93,
      sourceDocumentId: docExpId,
    });
    await this.profileService.upsertField(aiActor, {
      category: 'employment',
      fieldKey: 'currentRole',
      value: 'Software Engineer',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.95,
      sourceDocumentId: docExpId,
    });
    await this.profileService.upsertField(aiActor, {
      category: 'employment',
      fieldKey: 'yearsOfExperience',
      value: '3',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.91,
      sourceDocumentId: docExpId,
    });
    await this.profileService.upsertField(aiActor, {
      category: 'employment',
      fieldKey: 'startDate',
      value: '2020-07-01',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.94,
      sourceDocumentId: docExpId,
      sourceSnippet: 'Date of Joining: 01-July-2020 at Bangalore Development Centre',
    });
    await this.profileService.upsertField(aiActor, {
      category: 'employment',
      fieldKey: 'endDate',
      value: '2024-06-30',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.94,
      sourceDocumentId: docExpId,
    });

    // Skills
    await this.profileService.upsertField(aiActor, {
      category: 'skills',
      fieldKey: 'technicalSkills',
      value: 'TypeScript, Node.js, NestJS, Python, PostgreSQL, Docker, AWS',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.89,
      sourceDocumentId: docCvId,
    });

    // Motivation & Media (from Spoken Transcript)
    await this.profileService.upsertField(aiActor, {
      category: 'motivation',
      fieldKey: 'motivation',
      value: 'Seeking advanced tech roles and Master studies in Germany under the EU Blue Card programme.',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.90,
    });
    await this.profileService.upsertField(aiActor, {
      category: 'motivation',
      fieldKey: 'goals',
      value: 'Work as a full-stack / cloud engineer in Germany and advance German language proficiency from B1 to C1.',
      provenance: Provenance.AI_EXTRACTED,
      confidence: 0.90,
    });
    await this.profileService.upsertField(actor, {
      category: 'media',
      fieldKey: 'videoTranscript',
      value: 'Hi, I am Rahul Sharma. I have a B.Tech in Computer Science from 2021 and 3 years of software engineering experience. My goal is to move to Germany for a Blue Card tech career or master study, improve my German from B1 to C1, and build innovative products in Europe.',
      provenance: Provenance.APPLICANT_PROVIDED,
    });

    // 5. Seed Documents
    const docs = [
      {
        id: docDegreeId,
        type: 'DEGREE',
        filename: 'degree_certificate_dtu.pdf',
        extracted: [
          {
            key: 'degreeName',
            label: 'Degree Conferred',
            value: 'Bachelor of Technology in Computer Science and Engineering',
            confidence: 0.96,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
          {
            key: 'institution',
            label: 'University / Institution',
            value: 'Delhi Technological University',
            confidence: 0.94,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
          {
            key: 'graduationDate',
            label: 'Graduation Date',
            value: '2021-06-30',
            confidence: 0.95,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
          {
            key: 'cgpa',
            label: 'Cumulative Grade Point Average (CGPA)',
            value: '8.4 / 10.0',
            confidence: 0.92,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
        ],
      },
      {
        id: docGermanId,
        type: 'GERMAN_CERTIFICATE',
        filename: 'goethe_zertifikat_b1.pdf',
        extracted: [
          {
            key: 'germanLevel',
            label: 'CEFR German Level',
            value: 'B1',
            confidence: 0.95,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
          {
            key: 'certificateName',
            label: 'Certification Title',
            value: 'Goethe-Zertifikat B1',
            confidence: 0.95,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
          {
            key: 'certificateDate',
            label: 'Date of Examination',
            value: '2023-08-15',
            confidence: 0.90,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
        ],
      },
      {
        id: docExpId,
        type: 'EXPERIENCE_LETTER',
        filename: 'experience_letter_infosys.pdf',
        extracted: [
          {
            key: 'employer',
            label: 'Employing Organization',
            value: 'Infosys Limited',
            confidence: 0.93,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
          {
            key: 'currentRole',
            label: 'Designation / Role',
            value: 'Software Engineer',
            confidence: 0.95,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
          {
            key: 'startDate',
            label: 'Date of Joining (Start Date)',
            value: '2020-07-01',
            confidence: 0.94,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
          {
            key: 'endDate',
            label: 'Date of Relieving (End Date)',
            value: '2024-06-30',
            confidence: 0.94,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
          {
            key: 'yearsOfExperience',
            label: 'Total Completed Experience (Years)',
            value: '3',
            confidence: 0.91,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
        ],
      },
      {
        id: docCvId,
        type: 'CV',
        filename: 'rahul_sharma_cv.pdf',
        extracted: [
          {
            key: 'fullName',
            label: 'Candidate Name',
            value: 'Rahul Sharma',
            confidence: 0.98,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
          {
            key: 'technicalSkills',
            label: 'Technical Core Competencies',
            value: 'TypeScript, Node.js, NestJS, Python, PostgreSQL, Docker',
            confidence: 0.90,
            provenance: Provenance.AI_EXTRACTED,
            isConfirmed: false,
          },
        ],
      },
    ];

    for (const doc of docs) {
      await this.db.query(
        `INSERT INTO documents (id, user_id, document_type, filename, preview_url, status, extracted_data, created_at)
         VALUES ($1, $2, $3, $4, $5, 'EXTRACTED', $6, CURRENT_TIMESTAMP)`,
        [
          doc.id,
          userId,
          doc.type,
          doc.filename,
          `/uploads/${doc.filename}`,
          JSON.stringify(doc.extracted),
        ]
      );
    }

    // 6. Seed Agent Events
    await this.eventsService.logEvent({
      userId,
      agent: 'DocumentAgent',
      tool: 'pdfTextExtractor',
      reason: 'Extracted education credentials from DTU degree certificate',
      input: { filename: 'degree_certificate_dtu.pdf', pages: 1 },
      output: { degreeName: 'Bachelor of Technology', graduationDate: '2021-06-30', cgpa: '8.4' },
      confidence: 0.96,
      durationMs: 420,
    });

    await this.eventsService.logEvent({
      userId,
      agent: 'DocumentAgent',
      tool: 'pdfTextExtractor',
      reason: 'Extracted language certificate from Goethe B1 PDF',
      input: { filename: 'goethe_zertifikat_b1.pdf' },
      output: { germanLevel: 'B1', certificate: 'Goethe-Zertifikat B1' },
      confidence: 0.95,
      durationMs: 380,
    });

    await this.eventsService.logEvent({
      userId,
      agent: 'DocumentAgent',
      tool: 'pdfTextExtractor',
      reason: 'Extracted employment record from Infosys experience letter',
      input: { filename: 'experience_letter_infosys.pdf' },
      output: { employer: 'Infosys Limited', startDate: '2020-07-01', endDate: '2024-06-30' },
      confidence: 0.94,
      durationMs: 410,
    });

    // 7. Run Consistency Check so the planted date conflict is caught immediately!
    const inconsistencies = await this.consistencyService.checkInconsistencies(userId);

    this.logger.log(
      `Rahul Sharma persona seeded successfully. Inconsistency detected: ${inconsistencies.hasInconsistency} (${inconsistencies.discrepancies.length} discrepancy)`
    );

    return {
      success: true,
      userId,
      message: `Rahul Sharma seeded with B.Tech CS (2021), 3 yrs exp, German B1, and 1 planted inconsistency (startDate 2020-07-01 < graduation 2021-06-30).`,
    };
  }
}
