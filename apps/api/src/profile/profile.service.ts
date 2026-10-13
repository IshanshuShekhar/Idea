import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AgentEventsService } from '../agent-events/agent-events.service';
import {
  Provenance,
  UserRole,
  Pathway,
  ProfileFieldRecord,
  UpsertFieldDto,
  ComprehensiveApplicantProfile,
  ProfileCompletionReport,
  SectionStatusInfo,
} from '@educaro/shared';
import * as crypto from 'crypto';

export interface ActorContext {
  userId: string;
  role: UserRole;
  isAi?: boolean;
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
      // Human direct edits default to APPLICANT_PROVIDED
      finalProvenance = Provenance.APPLICANT_PROVIDED;
    }

    // Default provenance fallback if not specified
    if (!finalProvenance) {
      finalProvenance = actor.isAi ? Provenance.AI_EXTRACTED : Provenance.APPLICANT_PROVIDED;
    }

    // 3. Upsert into database
    const updatedAt = new Date().toISOString();
    const id = crypto.randomUUID();

    // Check existing
    const existing = await this.db.query(
      'SELECT id, value, provenance FROM profile_fields WHERE user_id = $1 AND field_key = $2',
      [actor.userId, dto.fieldKey]
    );

    let resultRecord: ProfileFieldRecord;

    if (existing.rows.length > 0) {
      // Update existing field
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
      // Insert new field
      const res = await this.db.query(
        `INSERT INTO profile_fields
         (id, user_id, category, field_key, value, provenance, confidence, source_document_id, source_snippet, updated_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
         RETURNING *`,
        [
          id,
          actor.userId,
          dto.category || 'general',
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

    // 5. HARD RULE 3: Log agent action if called from AI path
    if (actor.isAi) {
      await this.eventsService.logEvent({
        userId: actor.userId,
        agent: 'ProfileAgent',
        tool: 'upsertField',
        reason: `Upserted field ${dto.fieldKey} with provenance ${finalProvenance}`,
        input: dto,
        output: { fieldKey: resultRecord.fieldKey, provenance: resultRecord.provenance },
        confidence: dto.confidence,
        durationMs: Date.now() - startTime,
      });
    }

    return resultRecord;
  }

  async getProfile(userId: string): Promise<{ fields: ProfileFieldRecord[]; completenessScore: number }> {
    const res = await this.db.query(
      'SELECT * FROM profile_fields WHERE user_id = $1 ORDER BY category, field_key',
      [userId]
    );

    // If new profile has no fields, return empty profile
    if (res.rows.length === 0) {
      return { fields: [], completenessScore: 0 };
    }

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

    const completenessScore = this.computeScore(fields);
    return { fields, completenessScore };
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
    }
  ) {
    const actor = { userId, role: UserRole.APPLICANT, isAi: false };
    const savedFields: ProfileFieldRecord[] = [];

    // Personal details
    if (data.fullName) {
      const f = await this.upsertField(actor, {
        category: 'personal',
        fieldKey: 'fullName',
        value: data.fullName,
        provenance: Provenance.APPLICANT_PROVIDED,
      });
      savedFields.push(f);
    }
    if (data.email) {
      const f = await this.upsertField(actor, {
        category: 'personal',
        fieldKey: 'email',
        value: data.email,
        provenance: Provenance.APPLICANT_PROVIDED,
      });
      savedFields.push(f);
    }
    if (data.phone) {
      const f = await this.upsertField(actor, {
        category: 'personal',
        fieldKey: 'phone',
        value: data.phone,
        provenance: Provenance.APPLICANT_PROVIDED,
      });
      savedFields.push(f);
    }
    if (data.age) {
      const f = await this.upsertField(actor, {
        category: 'personal',
        fieldKey: 'age',
        value: String(data.age),
        provenance: Provenance.APPLICANT_PROVIDED,
      });
      savedFields.push(f);
    }
    if (data.country) {
      const f = await this.upsertField(actor, {
        category: 'personal',
        fieldKey: 'country',
        value: data.country,
        provenance: Provenance.APPLICANT_PROVIDED,
      });
      savedFields.push(f);
      // Keep currentLocation in sync
      await this.upsertField(actor, {
        category: 'personal',
        fieldKey: 'currentLocation',
        value: data.country,
        provenance: Provenance.APPLICANT_PROVIDED,
      });
    }

    // Language details
    if (data.germanLevel) {
      const f = await this.upsertField(actor, {
        category: 'languages',
        fieldKey: 'germanLevel',
        value: data.germanLevel,
        provenance: Provenance.APPLICANT_PROVIDED,
      });
      savedFields.push(f);
    }
    if (data.englishLevel) {
      const f = await this.upsertField(actor, {
        category: 'languages',
        fieldKey: 'englishLevel',
        value: data.englishLevel,
        provenance: Provenance.APPLICANT_PROVIDED,
      });
      savedFields.push(f);
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

    // Log to Agent Events
    await this.eventsService.logEvent({
      userId,
      agent: 'Profile System',
      tool: 'CandidateDetailsForm',
      reason: 'Captured applicant primary personal & language proficiency details (Applicant-Provided)',
      input: data,
      output: { savedFieldsCount: savedFields.length, provenance: Provenance.APPLICANT_PROVIDED },
      confidence: 1.0,
      durationMs: 35,
    });

    return { success: true, savedFields };
  }

  private computeScore(fields: ProfileFieldRecord[]): number {
    const keyFields = ['fullName', 'targetPathway', 'currentLocation', 'germanLevel', 'highestDegree'];
    const filled = keyFields.filter((key) => {
      const f = fields.find((item) => item.fieldKey === key);
      return f && f.value && f.value.trim().length > 0;
    }).length;

    return Math.round((filled / keyFields.length) * 100);
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

  // --------------------------------------------------------------------------
  // BAVARIAN FORMULA GRADE CONVERSION
  // --------------------------------------------------------------------------
  calculateGermanGrade(
    score: number,
    scale: string,
    maxGrade = 10,
    minPass = 4
  ): number {
    if (scale === 'GERMAN_SCALE') {
      return Number(Math.min(Math.max(score, 1.0), 4.0).toFixed(2));
    }
    let nMax = maxGrade || 10;
    let nMin = minPass || 4;

    if (scale === '10_POINT') {
      nMax = 10;
      nMin = 4;
    } else if (scale === 'PERCENTAGE') {
      nMax = 100;
      nMin = 40;
    } else if (scale === '4_POINT') {
      nMax = 4;
      nMin = 2;
    }

    if (nMax <= nMin) return 2.5;
    const clamped = Math.min(Math.max(score, nMin), nMax);
    const converted = 1 + 3 * ((nMax - clamped) / (nMax - nMin));
    return Number(Math.min(Math.max(converted, 1.0), 4.0).toFixed(2));
  }

  // --------------------------------------------------------------------------
  // COMPREHENSIVE PROFILE RETRIEVAL & AUTO-MIGRATION
  // --------------------------------------------------------------------------
  async getComprehensiveProfile(userId: string): Promise<ComprehensiveApplicantProfile> {
    const res = await this.db.query(
      'SELECT * FROM comprehensive_profiles WHERE user_id = $1',
      [userId]
    );

    if (res.rows.length > 0) {
      try {
        const parsed = JSON.parse(res.rows[0].profile_data);
        parsed.id = res.rows[0].id;
        parsed.status = res.rows[0].status || 'DRAFT';
        parsed.completenessScore = res.rows[0].completeness_score || 0;
        return parsed;
      } catch (err) {
        this.logger.warn(`Failed to parse comprehensive profile for user ${userId}, regenerating from sources`, err);
      }
    }

    // Auto-migrate from existing sources
    return this.migrateFromExistingSources(userId);
  }

  async migrateFromExistingSources(userId: string): Promise<ComprehensiveApplicantProfile> {
    const userRes = await this.db.query('SELECT email FROM users WHERE id = $1', [userId]);
    const appRes = await this.db.query('SELECT * FROM applicants WHERE user_id = $1', [userId]);
    const fieldsRes = await this.db.query('SELECT field_key, value FROM profile_fields WHERE user_id = $1', [userId]);
    const docsRes = await this.db.query('SELECT * FROM documents WHERE user_id = $1', [userId]);
    const legacyProfRes = await this.db.query('SELECT * FROM applicant_profiles WHERE user_id = $1', [userId]);

    const userEmail = userRes.rows[0]?.email || '';
    const applicant = appRes.rows[0] || {};
    const fieldMap: Record<string, string> = {};
    for (const r of fieldsRes.rows) {
      fieldMap[r.field_key] = r.value;
    }

    let step1: any = {};
    let step2: any = {};
    let step3: any = {};
    let step4: any = {};
    let step5: any = {};
    if (legacyProfRes.rows.length > 0) {
      try {
        step1 = JSON.parse(legacyProfRes.rows[0].step1_json || '{}');
        step2 = JSON.parse(legacyProfRes.rows[0].step2_json || '{}');
        step3 = JSON.parse(legacyProfRes.rows[0].step3_json || '{}');
        step4 = JSON.parse(legacyProfRes.rows[0].step4_json || '{}');
        step5 = JSON.parse(legacyProfRes.rows[0].step5_json || '{}');
      } catch (e) {
        this.logger.warn('Error reading legacy applicant_profiles JSON', e);
      }
    }

    // Pathway extraction
    let primaryPathway: Pathway = Pathway.STUDY;
    const rawGoal = fieldMap['targetPathway'] || applicant.goal || step1.intendedStudyLevel || '';
    if (rawGoal.toUpperCase().includes('AUSBILDUNG') || rawGoal.toUpperCase().includes('VOCATIONAL') || rawGoal.toUpperCase().includes('TRAINING')) {
      primaryPathway = Pathway.AUSBILDUNG;
    } else if (rawGoal.toUpperCase().includes('EMPLOYMENT') || rawGoal.toUpperCase().includes('JOB') || rawGoal.toUpperCase().includes('WORK')) {
      primaryPathway = Pathway.EMPLOYMENT;
    }

    // German level
    const rawGerman = (fieldMap['germanLevel'] || step3.germanProficiency || 'NONE').toUpperCase();
    let germanLevel: any = 'NONE';
    if (rawGerman.includes('C2')) germanLevel = 'C2';
    else if (rawGerman.includes('C1')) germanLevel = 'C1';
    else if (rawGerman.includes('B2')) germanLevel = 'B2';
    else if (rawGerman.includes('B1')) germanLevel = 'B1';
    else if (rawGerman.includes('A2')) germanLevel = 'A2';
    else if (rawGerman.includes('A1')) germanLevel = 'A1';

    // English level
    const rawEnglish = (fieldMap['englishLevel'] || step3.englishProficiency || 'FLUENT').toUpperCase();
    let englishLevel: any = 'FLUENT';
    if (rawEnglish.includes('NATIVE')) englishLevel = 'NATIVE';
    else if (rawEnglish.includes('BASIC')) englishLevel = 'BASIC';
    else if (rawEnglish.includes('INTERMEDIATE')) englishLevel = 'INTERMEDIATE';

    // Academic score & German grade
    const scoreVal = step2.cgpaOrPercentage || fieldMap['gradeOrGpa'] || 8.0;
    const gradingScale = step2.gradingScale || '10_POINT';
    const estimatedGermanGrade = step2.estimatedGermanGrade || this.calculateGermanGrade(Number(scoreVal), gradingScale);

    // Map documents
    const docItems = docsRes.rows.map((d: any) => ({
      id: d.id,
      documentType: d.document_type,
      title: d.filename || d.document_type,
      isMandatory: ['DEGREE_CERTIFICATE', 'LANGUAGE_CERTIFICATE'].includes(d.document_type),
      uploadStatus: 'UPLOADED' as const,
      filename: d.filename,
      filePath: d.preview_url,
      uploadDate: d.created_at,
      verificationStatus: (d.status || 'EXTRACTED') as any,
    }));

    const defaultProfile: ComprehensiveApplicantProfile = {
      id: crypto.randomUUID(),
      userId,
      status: 'DRAFT',
      isComplete: false,
      completenessScore: 40,
      lastSavedAt: new Date().toISOString(),

      personal: {
        fullName: fieldMap['fullName'] || applicant.name || step1.fullName || '',
        dateOfBirth: '',
        email: fieldMap['email'] || applicant.email || userEmail,
        phone: fieldMap['phone'] || applicant.phone || '',
        phoneCountryCode: '+91',
        nationality: step1.nationality || 'Indian',
        countryOfResidence: fieldMap['country'] || fieldMap['currentLocation'] || applicant.location || step1.residenceCountry || 'India',
        currentCity: fieldMap['city'] || (applicant.location && applicant.location.includes(',') ? applicant.location.split(',')[0].trim() : '') || 'Bangalore',
        currentAddress: '',
        passportStatus: 'HAVE_PASSPORT',
        passportNumber: '',
        passportExpiryDate: '',
        preferredLanguage: 'en',
      },

      goals: {
        primaryPathway,
        secondaryPathway: '',
        specificDegreeLevel: primaryPathway === Pathway.STUDY ? (step1.intendedStudyLevel || 'Master’s degree') : primaryPathway === Pathway.AUSBILDUNG ? 'Ausbildung (vocational training)' : 'Skilled employment',
        preferredFieldOrIndustry: step1.intendedSubject || 'Computer Science & Engineering',
        preferredCitiesOrRegions: step5.preferredCities || ['Munich', 'Berlin', 'Aachen', 'Stuttgart'],
        expectedTimeline: 'Winter Semester 2026/27',
        intendedIntakeYear: '2026',
        readinessStatus: 'PREPARING',
      },

      academic: {
        highestCompletedQualification: step1.currentEducationLevel || fieldMap['highestDegree'] || 'Bachelor of Technology (B.Tech)',
        currentQualificationStatus: 'COMPLETED',
        currentQualificationName: '',
        degreeName: fieldMap['degree'] || fieldMap['degreeName'] || step1.currentDegree || 'B.Tech in Computer Science',
        streamOrSpecialization: step2.degreeSubjectSpecialisation || 'Computer Science & Engineering',
        institutionName: fieldMap['institution'] || fieldMap['university'] || step1.currentUniversity || 'Anna University',
        countryOfEducation: 'India',
        graduationYear: fieldMap['graduationYear'] || step1.graduationYear || 2024,
        gradingScale,
        scoreValue: scoreVal,
        maxGrade: 10,
        minPassingGrade: 4,
        estimatedGermanGrade,
        backlogsCount: step2.backlogsCount || 0,
        transcriptsAvailable: true,
        degreeCertificateAvailable: true,
        previousEducationHistory: step2.previousQualifications || '12th Standard CBSE Science Stream (Physics, Chemistry, Math)',
        academicAchievements: (step2.academicAwards || []).join(', '),
        bachelorSubjects: step2.relevantSubjectsCompleted || ['Data Structures', 'Operating Systems', 'Discrete Mathematics'],
        bachelorTotalCreditsECTS: step2.totalCreditsECTS || 180,
        bachelorMathCreditsECTS: step2.mathProgrammingBackground?.mathCreditsECTS || 24,
        bachelorCsCreditsECTS: step2.mathProgrammingBackground?.csCreditsECTS || 48,
        hasHigherMath: step2.mathProgrammingBackground?.hasHigherMath ?? true,
        hasProgramming: step2.mathProgrammingBackground?.hasProgramming ?? true,
        programmingLanguages: step2.mathProgrammingBackground?.programmingLanguages || ['Python', 'Java', 'SQL'],
        school12thBoard: 'CBSE',
        school12thPercentage: 88,
        schoolStream: 'Science (PCM)',
        vocationalQualifications: '',
        practicalTrainingExperience: '',
      },

      languages: {
        germanLevel,
        germanCertificateAvailable: ['B1', 'B2', 'C1', 'C2'].includes(germanLevel),
        germanExamType: step3.germanExamProvider || (['B1', 'B2', 'C1'].includes(germanLevel) ? 'GOETHE' : 'NONE'),
        germanScore: step3.goetheResult || '',
        germanExamDate: '',
        isCurrentlyLearningGerman: true,
        targetGermanLevel: 'B2',
        expectedGermanExamDate: '2026-12-15',
        englishLevel,
        englishExamType: step3.englishExamProvider || 'IELTS',
        englishScore: step3.englishScore || 7.5,
        englishExamDate: step3.testDate || '2025-09-15',
        englishCertificateAvailable: true,
      },

      exams: {
        hasTakenEntranceExams: false,
        exams: [
          {
            id: 'exam-1',
            testName: 'IELTS Academic',
            status: 'TAKEN',
            score: '7.5 Overall',
            examDate: '2025-09-15',
            certificateAvailable: true,
          },
        ],
      },

      experience: {
        currentEmploymentStatus: 'EMPLOYED',
        totalExperienceYears: fieldMap['workExperience'] ? 2 : 1,
        jobs: [
          {
            id: 'job-1',
            jobTitle: 'Software Engineer',
            employerName: 'Digital Solutions India',
            employmentType: 'FULL_TIME',
            startDate: '2024-07-01',
            endDate: '',
            isCurrent: true,
            responsibilities: fieldMap['workExperience'] || 'Full-stack application development with TypeScript and cloud deployment.',
          },
        ],
        internships: (step4.internships || []).map((i: any) => ({
          id: i.id || crypto.randomUUID(),
          role: i.role || 'Engineering Intern',
          organization: i.organization || 'Tech Labs',
          durationMonths: i.durationMonths || 6,
          description: i.description || 'Assisted with software engineering and testing.',
        })),
        projects: (step4.projects || []).map((p: any) => ({
          id: p.id || crypto.randomUUID(),
          title: p.title || 'Engineering Project',
          category: p.category || 'AI / Software',
          technologies: p.technologies || ['Python', 'React'],
          description: p.description || 'Applied academic concepts in real-world software prototype.',
          url: p.githubUrl || '',
        })),
        technicalSkills: fieldMap['technicalSkills'] ? fieldMap['technicalSkills'].split(',').map((s: string) => s.trim()) : ['Python', 'JavaScript', 'SQL', 'Git', 'Data Structures'],
        certifications: ['AWS Certified Cloud Practitioner'],
        portfolioUrl: '',
        githubUrl: 'https://github.com',
        linkedinUrl: 'https://linkedin.com',
        resumeFileName: 'Resume_Rahul_Sharma.pdf',
        keyAchievements: 'Dean’s Honor List 2023, National Hackathon Finalist',
      },

      studyPrefs: {
        preferredDegreeLevel: 'MASTER',
        preferredSubject: step1.intendedSubject || 'Computer Science',
        preferredInstitutions: ['Technical University of Munich', 'RWTH Aachen University', 'Karlsruhe Institute of Technology'],
        preferredStates: step5.preferredStates || ['Bavaria', 'Baden-Württemberg', 'North Rhine-Westphalia'],
        preferredCities: step5.preferredCities || ['Munich', 'Aachen', 'Karlsruhe'],
        institutionPreference: 'PUBLIC_ONLY',
        teachingLanguagePreference: step1.preferredStudyLanguage || 'ENGLISH',
        studyMode: 'FULL_TIME',
        desiredStartSemester: 'Winter Semester 2026/27',
        maxTuitionBudgetEUR: step5.maxTuitionBudgetEUR ?? 1500,
        monthlyLivingBudgetEUR: step5.maxAffordableMonthlyLivingEUR ?? 950,
        academicEligibilityNotes: 'Anabin H+ institution recognized for direct Master admission.',
        previousApplications: '',
        preferredCourseDurationSemesters: 4,
      },

      ausbildungPrefs: {
        preferredOccupation: 'Fachinformatiker für Anwendungsentwicklung (IT Application Development)',
        preferredIndustry: 'Information Technology / Healthcare',
        relevantSchoolQualifications: '12th Standard Higher Secondary (PCM)',
        practicalExperience: 'Hands-on coding, internship experience, and hardware troubleshooting.',
        preferredLocations: ['Berlin', 'Frankfurt', 'Munich'],
        desiredStartDate: '2026-09-01',
        expectedStipendEUR: 1100,
        vocationalCertifications: 'Certified Java Associate',
        existingOffers: '',
        vocationalInterests: 'System administration, software engineering, enterprise integration.',
      },

      employmentPrefs: {
        targetJobTitle: 'Full-Stack Software Engineer / Cloud Developer',
        targetIndustry: 'Technology & Enterprise Software',
        relevantQualifications: '4-Year B.Tech Computer Science (Anabin H+ Recognized)',
        experienceSummary: '1.5+ years developing web services, microservices, and databases.',
        preferredLocations: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'],
        expectedSalaryEUR: 58000,
        noticePeriodDays: 30,
        employmentType: 'PERMANENT',
        workAuthorizationStatus: 'BLUE_CARD_ELIGIBLE',
        existingJobOffers: '',
      },

      financial: {
        annualBudgetEUR: step5.annualBudgetEUR || 12500,
        tuitionBudgetEUR: step5.maxTuitionBudgetEUR || 1500,
        monthlyLivingCostEUR: step5.maxAffordableMonthlyLivingEUR || 950,
        financialProofMethod: 'BLOCKED_ACCOUNT',
        interestedInScholarships: true,
        interestedInFunding: true,
        scholarshipPreferences: ['DAAD Study Scholarships', 'Deutschlandstipendium', 'Bavarian State Merit Award'],
        sportsAchievements: 'Inter-collegiate badminton tournament finalist',
        extracurricularOrVolunteering: 'Youth STEM coding workshops mentor',
        academicMeritHighlights: 'Top 5% Departmental Ranking, GPA 8.5/10',
        isFirstGenerationStudent: false,
        needsDisabilityAccommodation: false,
        sensitiveDataConsent: true,
      },

      documents: {
        documents: docItems,
      },

      previousApps: {
        contactedInstitutions: 'None yet',
        appliedPrograms: '',
        existingOffers: '',
        previousRejections: '',
        applicationStage: 'PREPARING_DOCUMENTS',
        completedRequirements: ['Passport validity verified', 'Official transcripts obtained'],
        outstandingRequirements: ['Official German B1 certificate exam', 'APS Certificate Application submission'],
        mainChallenges: 'Scheduling German exam date and compiling syllabus credit details for ECTS equivalency.',
        assistanceNeeded: ['Document verification', 'University shortlisting', 'APS filing review'],
      },

      additional: {
        additionalPreferences: 'Prefers public universities with strong campus career placement and low living costs.',
        specialRequirements: 'Needs guidance on German blocked account opening (Expatrio / Coracle).',
        constraints: 'Looking to join in Winter Semester 2026 without taking a gap year.',
        additionalNotes: 'Profile created from applicant intake.',
      },
    };

    // Calculate initial completion
    const report = this.computeCompletionMetrics(defaultProfile);
    defaultProfile.completenessScore = report.overallCompletenessPct;
    defaultProfile.isComplete = report.isReadyForSubmission;

    // Save initial migration to comprehensive_profiles
    const profileId = defaultProfile.id || crypto.randomUUID();
    await this.db.query(
      `INSERT INTO comprehensive_profiles (id, user_id, status, completeness_score, profile_data, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         completeness_score = EXCLUDED.completeness_score,
         profile_data = EXCLUDED.profile_data,
         updated_at = CURRENT_TIMESTAMP`,
      [profileId, userId, defaultProfile.status, defaultProfile.completenessScore, JSON.stringify(defaultProfile)],
    );

    return defaultProfile;
  }

  // --------------------------------------------------------------------------
  // SAVE COMPREHENSIVE PROFILE & SYNC SINGLE SOURCE OF TRUTH
  // --------------------------------------------------------------------------
  async saveComprehensiveProfile(
    userId: string,
    data: Partial<ComprehensiveApplicantProfile>,
    isDraft = true,
  ): Promise<{ profile: ComprehensiveApplicantProfile; completion: ProfileCompletionReport }> {
    const existing = await this.getComprehensiveProfile(userId);

    // Merge incoming data into existing
    const merged: ComprehensiveApplicantProfile = {
      ...existing,
      ...data,
      userId,
      status: isDraft ? 'DRAFT' : 'COMPLETED',
      lastSavedAt: new Date().toISOString(),
      personal: { ...existing.personal, ...(data.personal || {}) },
      goals: { ...existing.goals, ...(data.goals || {}) },
      academic: { ...existing.academic, ...(data.academic || {}) },
      languages: { ...existing.languages, ...(data.languages || {}) },
      exams: { ...existing.exams, ...(data.exams || {}) },
      experience: { ...existing.experience, ...(data.experience || {}) },
      studyPrefs: { ...(existing.studyPrefs || {} as any), ...(data.studyPrefs || {}) },
      ausbildungPrefs: { ...(existing.ausbildungPrefs || {} as any), ...(data.ausbildungPrefs || {}) },
      employmentPrefs: { ...(existing.employmentPrefs || {} as any), ...(data.employmentPrefs || {}) },
      financial: { ...existing.financial, ...(data.financial || {}) },
      documents: { ...existing.documents, ...(data.documents || {}) },
      previousApps: { ...existing.previousApps, ...(data.previousApps || {}) },
      additional: { ...existing.additional, ...(data.additional || {}) },
      accessibility: { ...(existing.accessibility || {}), ...(data.accessibility || {}) },
      sports: data.sports !== undefined ? data.sports : (existing.sports || []),
      otherAchievements: data.otherAchievements !== undefined ? data.otherAchievements : (existing.otherAchievements || []),
    };

    // Calculate Bavarian formula grade if academic score provided
    if (merged.academic?.scoreValue) {
      const scoreNum = parseFloat(String(merged.academic.scoreValue));
      if (!isNaN(scoreNum)) {
        merged.academic.estimatedGermanGrade = this.calculateGermanGrade(
          scoreNum,
          merged.academic.gradingScale || '10_POINT',
          merged.academic.maxGrade || 10,
          merged.academic.minPassingGrade || 4
        );
      }
    }

    // Compute completion metrics
    const completion = this.computeCompletionMetrics(merged);
    merged.completenessScore = completion.overallCompletenessPct;
    merged.isComplete = completion.isReadyForSubmission;

    if (!isDraft && !completion.isReadyForSubmission) {
      const missingList = completion.allMissingMandatory.map((m) => `${m.label} (${m.section})`).join(', ');
      throw new BadRequestException(
        `Cannot mark profile as completed. Please fill all required fields: ${missingList}`
      );
    }

    const profileId = merged.id || existing.id || crypto.randomUUID();
    merged.id = profileId;

    // 1. Save to comprehensive_profiles
    const checkExisting = await this.db.query(
      'SELECT id FROM comprehensive_profiles WHERE user_id = $1',
      [userId]
    );

    if (checkExisting.rows.length > 0) {
      await this.db.query(
        `UPDATE comprehensive_profiles
         SET status = $1, completeness_score = $2, profile_data = $3, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4`,
        [merged.status, merged.completenessScore, JSON.stringify(merged), userId]
      );
    } else {
      await this.db.query(
        `INSERT INTO comprehensive_profiles (id, user_id, status, completeness_score, profile_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [profileId, userId, merged.status, merged.completenessScore, JSON.stringify(merged)]
      );
    }

    // 2. Sync to applicants table
    await this.db.query(
      `UPDATE applicants
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           location = COALESCE($4, location),
           goal = COALESCE($5, goal),
           completeness_pct = $6
       WHERE user_id = $7`,
      [
        merged.personal.fullName || null,
        merged.personal.email || null,
        merged.personal.phone || null,
        merged.personal.countryOfResidence || null,
        merged.goals.primaryPathway || null,
        merged.completenessScore,
        userId,
      ]
    );

    // 3. Sync to profile_fields with APPLICANT_PROVIDED provenance
    const actor = { userId, role: UserRole.APPLICANT, isAi: false };
    const fieldsToSync: { category: string; fieldKey: string; value: string }[] = [
      { category: 'PERSONAL', fieldKey: 'fullName', value: merged.personal.fullName },
      { category: 'PERSONAL', fieldKey: 'email', value: merged.personal.email },
      { category: 'PERSONAL', fieldKey: 'phone', value: merged.personal.phone },
      { category: 'PERSONAL', fieldKey: 'country', value: merged.personal.countryOfResidence },
      { category: 'PERSONAL', fieldKey: 'city', value: merged.personal.currentCity },
      { category: 'PERSONAL', fieldKey: 'currentLocation', value: merged.personal.countryOfResidence },
      { category: 'GOAL', fieldKey: 'targetPathway', value: merged.goals.primaryPathway },
      { category: 'EDUCATION', fieldKey: 'degree', value: merged.academic.degreeName },
      { category: 'EDUCATION', fieldKey: 'degreeName', value: merged.academic.degreeName },
      { category: 'EDUCATION', fieldKey: 'highestDegree', value: merged.academic.highestCompletedQualification },
      { category: 'EDUCATION', fieldKey: 'institution', value: merged.academic.institutionName },
      { category: 'EDUCATION', fieldKey: 'graduationYear', value: String(merged.academic.graduationYear || '') },
      { category: 'EDUCATION', fieldKey: 'gradeOrGpa', value: String(merged.academic.scoreValue || '') },
      { category: 'LANGUAGES', fieldKey: 'germanLevel', value: merged.languages.germanLevel },
      { category: 'LANGUAGES', fieldKey: 'englishLevel', value: merged.languages.englishLevel },
      { category: 'EMPLOYMENT', fieldKey: 'workExperience', value: merged.experience.jobs?.[0]?.responsibilities || String(merged.experience.totalExperienceYears || '') },
      { category: 'SKILLS', fieldKey: 'technicalSkills', value: (merged.experience.technicalSkills || []).join(', ') },
    ];

    for (const f of fieldsToSync) {
      if (f.value && f.value.trim().length > 0) {
        await this.upsertField(actor, {
          category: f.category,
          fieldKey: f.fieldKey,
          value: f.value,
          provenance: Provenance.APPLICANT_PROVIDED,
        });
      }
    }

    // 4. Sync to legacy applicant_profiles so EngineService reads instantly
    const step1Sync = {
      fullName: merged.personal.fullName,
      email: merged.personal.email,
      nationality: merged.personal.nationality,
      residenceCountry: merged.personal.countryOfResidence,
      currentEducationLevel: merged.academic.highestCompletedQualification,
      currentUniversity: merged.academic.institutionName,
      currentDegree: merged.academic.degreeName,
      graduationYear: Number(merged.academic.graduationYear) || 2024,
      intendedIntake: merged.goals.expectedTimeline,
      intendedStudyLevel: (merged.studyPrefs?.preferredDegreeLevel || 'MASTER') as any,
      intendedSubject: merged.studyPrefs?.preferredSubject || merged.goals.preferredFieldOrIndustry,
      preferredStudyLanguage: (merged.studyPrefs?.teachingLanguagePreference || 'ENGLISH') as any,
    };

    const step2Sync = {
      cgpaOrPercentage: Number(merged.academic.scoreValue) || 8.0,
      gradingScale: merged.academic.gradingScale as any,
      maxGradeOnScale: merged.academic.maxGrade || 10,
      minPassingGradeOnScale: merged.academic.minPassingGrade || 4,
      estimatedGermanGrade: merged.academic.estimatedGermanGrade,
      previousQualifications: merged.academic.previousEducationHistory || '',
      degreeSubjectSpecialisation: merged.academic.streamOrSpecialization,
      relevantSubjectsCompleted: merged.academic.bachelorSubjects || [],
      mathProgrammingBackground: {
        hasHigherMath: merged.academic.hasHigherMath ?? true,
        mathCreditsECTS: merged.academic.bachelorMathCreditsECTS || 24,
        hasProgramming: merged.academic.hasProgramming ?? true,
        programmingLanguages: merged.academic.programmingLanguages || ['Python', 'Java', 'SQL'],
        csCreditsECTS: merged.academic.bachelorCsCreditsECTS || 48,
      },
      totalCreditsECTS: merged.academic.bachelorTotalCreditsECTS || 180,
      backlogsCount: merged.academic.backlogsCount || 0,
      researchExperience: '',
      academicAwards: merged.academic.academicAchievements ? [merged.academic.academicAchievements] : [],
    };

    const step3Sync = {
      germanProficiency: merged.languages.germanLevel as any,
      germanExamProvider: (merged.languages.germanExamType || 'GOETHE') as any,
      goetheResult: merged.languages.germanScore || '',
      englishProficiency: (merged.languages.englishLevel === 'NATIVE' ? 'NATIVE' : 'ADVANCED') as any,
      englishExamProvider: (merged.languages.englishExamType || 'IELTS') as any,
      englishScore: Number(merged.languages.englishScore) || 7.5,
      testDate: merged.languages.englishExamDate || '',
      validUntil: '',
    };

    const step4Sync = {
      projects: (merged.experience.projects || []).map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category || 'AI / Software',
        description: p.description,
        technologies: p.technologies,
        githubUrl: p.url,
      })),
      internships: (merged.experience.internships || []).map((i) => ({
        id: i.id,
        role: i.role,
        organization: i.organization,
        durationMonths: i.durationMonths,
        description: i.description,
      })),
      publications: (merged.otherAchievements || [])
        .filter((e) => e.category === 'RESEARCH')
        .map((e) => ({
          id: e.id,
          title: e.title,
          venue: e.issuerOrOrganization || 'Academic Journal / Conference',
          year: parseInt(e.achievementDate || '2024', 10) || 2024,
        })),
      competitions: (merged.otherAchievements || [])
        .filter((e) => e.category === 'OLYMPIAD_COMPETITION' || e.category === 'ACADEMIC_AWARD')
        .map((e) => ({
          id: e.id,
          name: e.title,
          achievement: e.description || e.issuerOrOrganization || 'Honorable mention',
          year: parseInt(e.achievementDate || '2024', 10) || 2024,
        })),
      sports: (Array.isArray(merged.sports) && merged.sports.length > 0)
        ? merged.sports.map((s) => ({
            sportName: s.sportName,
            competitionLevel: (s.competitionLevel === 'SCHOOL' || s.competitionLevel === 'UNIVERSITY' ? 'COLLEGE' : s.competitionLevel) as any,
            achievements: [s.competitionName, s.awardsOrMedals, s.notes].filter(Boolean).join(' - ') || 'Participant',
            certifications: s.certificateUrl ? 'Certificate on file' : undefined,
            isOfficialCompetitor: ['STATE', 'NATIONAL', 'INTERNATIONAL'].includes(s.competitionLevel),
          }))
        : (merged.financial.sportsAchievements
          ? [{ sportName: merged.financial.sportsAchievements, competitionLevel: 'COLLEGE' as any, achievements: merged.financial.sportsAchievements, isOfficialCompetitor: false }]
          : []),
      volunteering: (merged.otherAchievements || [])
        .filter((e) => e.category === 'VOLUNTEERING' || e.category === 'EXTRACURRICULAR')
        .map((e) => ({
          organization: e.issuerOrOrganization || 'Community Organization',
          role: e.title || 'Volunteer',
          durationMonths: 12,
          description: e.description || e.title,
        }))
        .concat(
          merged.financial.extracurricularOrVolunteering
            ? [{ organization: merged.financial.extracurricularOrVolunteering, role: 'Volunteer', durationMonths: 12, description: merged.financial.extracurricularOrVolunteering }]
            : []
        ),
      leadershipRoles: (merged.otherAchievements || [])
        .filter((e) => e.category === 'LEADERSHIP')
        .map((e) => e.title),
    };

    const step5Sync = {
      annualBudgetEUR: merged.financial.annualBudgetEUR || 12500,
      needsFullFunding: merged.financial.fundingNeedLevel === 'FULL',
      partialScholarshipAcceptable: true,
      maxAffordableMonthlyLivingEUR: merged.financial.monthlyLivingCostEUR || 950,
      preferredStates: merged.studyPrefs?.preferredStates || ['Bavaria', 'Baden-Württemberg', 'North Rhine-Westphalia'],
      preferredCities: merged.studyPrefs?.preferredCities || ['Munich', 'Aachen', 'Karlsruhe'],
      publicOrPrivatePreference: (merged.studyPrefs?.institutionPreference || 'PUBLIC_ONLY') as any,
      maxTuitionBudgetEUR: merged.financial.tuitionBudgetEUR || 1500,
      willingnessToStudyInGerman: merged.studyPrefs?.teachingLanguagePreference === 'GERMAN' || merged.studyPrefs?.teachingLanguagePreference === 'BILINGUAL',
      targetTimelineMonths: 10,
    };

    await this.db.query(
      `INSERT INTO applicant_profiles (id, user_id, step1_json, step2_json, step3_json, step4_json, step5_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         step1_json = EXCLUDED.step1_json,
         step2_json = EXCLUDED.step2_json,
         step3_json = EXCLUDED.step3_json,
         step4_json = EXCLUDED.step4_json,
         step5_json = EXCLUDED.step5_json,
         updated_at = CURRENT_TIMESTAMP`,
      [
        crypto.randomUUID(),
        userId,
        JSON.stringify(step1Sync),
        JSON.stringify(step2Sync),
        JSON.stringify(step3Sync),
        JSON.stringify(step4Sync),
        JSON.stringify(step5Sync),
      ]
    );

    // Sync sensitive scholarship data if present
    const isFemaleOrWoman = merged.personal.gender === 'WOMAN';
    const targetSubject = (merged.goals.preferredFieldOrIndustry || merged.academic.streamOrSpecialization || '').toLowerCase();
    const isStemSubject = ['computer', 'data', 'information technology', 'software', 'engineering', 'robotics', 'physics', 'mathematics', 'biotechnology', 'stem'].some((k) => targetSubject.includes(k));
    const hasDisabilitySupport = Boolean(
      merged.accessibility?.wantsToDisclose &&
      (merged.accessibility?.hasPhysicalDisability ||
        merged.accessibility?.hasVisualImpairment ||
        merged.accessibility?.hasHearingImpairment ||
        merged.accessibility?.hasLearningOrNeurodevelopmental ||
        merged.accessibility?.hasOtherDisability ||
        Boolean(merged.accessibility?.accommodationsRequired))
    );
    const hasFinancialNeed = Boolean(
      merged.financial.interestedInScholarships ||
      merged.financial.interestedInFunding ||
      merged.financial.fundingNeedLevel === 'FULL' ||
      merged.financial.fundingNeedLevel === 'PARTIAL' ||
      merged.financial.financialNeedBracket === 'LOW_INCOME' ||
      merged.financial.financialNeedBracket === 'LOWER_MIDDLE'
    );

    const step6Sync = {
      exploreAcademicMerit: true,
      exploreFinancialNeed: hasFinancialNeed,
      financialNeedBracket: (merged.financial.financialNeedBracket === 'LOW_INCOME' || merged.financial.financialNeedBracket === 'LOWER_MIDDLE' ? merged.financial.financialNeedBracket : (hasFinancialNeed ? 'LOW_INCOME' : 'MIDDLE')) as any,
      hasIncomeCertificate: false,
      exploreSportsScholarships: (Array.isArray(merged.sports) && merged.sports.length > 0) || Boolean(merged.financial.sportsAchievements),
      exploreWomenInStem: isFemaleOrWoman,
      isEligibleForWomenInStem: isFemaleOrWoman && isStemSubject,
      exploreDisabilitySupport: hasDisabilitySupport,
      disabilitySupportNeeds: hasDisabilitySupport ? {
        needsAccessibilityAccommodation: Boolean(merged.accessibility?.accommodationsRequired || merged.accessibility?.hasPhysicalDisability || merged.accessibility?.hasVisualImpairment || merged.accessibility?.hasHearingImpairment),
        needsAdditionalExpenseAssistance: true,
        exploringSpecificFunding: true,
      } : undefined,
      exploreRefugeeHumanitarian: false,
      exploreFirstGeneration: Boolean(merged.financial.isFirstGenerationStudent),
      isFirstGenerationStudent: Boolean(merged.financial.isFirstGenerationStudent),
      exploreSocialCommunity: (merged.otherAchievements || []).some((e) => e.category === 'VOLUNTEERING' || e.category === 'LEADERSHIP'),
      exploreResearchInnovation: (merged.otherAchievements || []).some((e) => e.category === 'RESEARCH'),
      consentGivenAt: new Date().toISOString(),
    };

    await this.db.query(
      `INSERT INTO profile_sensitive_data (
        id, user_id, step6_json, consent_given_at, consent_withdrawn_at, updated_at
      ) VALUES ($1, $2, $3, $4, NULL, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        step6_json = EXCLUDED.step6_json,
        consent_given_at = EXCLUDED.consent_given_at,
        consent_withdrawn_at = NULL,
        updated_at = CURRENT_TIMESTAMP`,
      [crypto.randomUUID(), userId, JSON.stringify(step6Sync), step6Sync.consentGivenAt],
    );

    // 5. Log audit event
    await this.eventsService.logEvent({
      userId,
      agent: 'Profile Service',
      tool: 'ComprehensiveProfileManager',
      reason: `Saved applicant profile (${isDraft ? 'Draft' : 'Final Submit'}). Completeness: ${merged.completenessScore}%`,
      input: { isDraft, primaryPathway: merged.goals.primaryPathway },
      output: { status: merged.status, completenessPct: merged.completenessScore },
      confidence: 1.0,
      durationMs: 40,
    });

    return { profile: merged, completion };
  }

  // --------------------------------------------------------------------------
  // PATHWAY-SENSITIVE COMPLETION METRICS
  // --------------------------------------------------------------------------
  computeCompletionMetrics(p: ComprehensiveApplicantProfile): ProfileCompletionReport {
    const pathway = p.goals.primaryPathway || Pathway.STUDY;
    const sections: SectionStatusInfo[] = [];
    const allMissingMandatory: { section: string; field: string; label: string }[] = [];
    const allMissingOptional: { section: string; field: string; label: string }[] = [];

    // Helper
    const evaluateSection = (
      key: string,
      title: string,
      mandatoryFields: { field: string; label: string; filled: boolean }[],
      optionalFields: { field: string; label: string; filled: boolean }[]
    ): SectionStatusInfo => {
      const missingMandatory = mandatoryFields.filter((f) => !f.filled);
      const missingOptional = optionalFields.filter((f) => !f.filled);

      for (const m of missingMandatory) {
        allMissingMandatory.push({ section: title, field: m.field, label: m.label });
      }
      for (const o of missingOptional) {
        allMissingOptional.push({ section: title, field: o.field, label: o.label });
      }

      const totalMandatory = mandatoryFields.length;
      const filledMandatory = totalMandatory - missingMandatory.length;
      const pct = totalMandatory > 0 ? Math.round((filledMandatory / totalMandatory) * 100) : 100;

      let status: 'COMPLETED' | 'IN_PROGRESS' | 'EMPTY' = 'IN_PROGRESS';
      if (pct === 100) status = 'COMPLETED';
      else if (filledMandatory === 0) status = 'EMPTY';

      return {
        sectionKey: key,
        title,
        status,
        completionPct: pct,
        missingMandatoryCount: missingMandatory.length,
        missingMandatoryFields: missingMandatory.map((m) => m.label),
        missingOptionalFields: missingOptional.map((o) => o.label),
      };
    };

    // Section A: Personal
    sections.push(
      evaluateSection(
        'personal',
        'Section A: Personal Information',
        [
          { field: 'fullName', label: 'Full Legal Name', filled: Boolean(p.personal?.fullName?.trim()) },
          { field: 'email', label: 'Email Address', filled: Boolean(p.personal?.email?.trim()) },
          { field: 'phone', label: 'Phone Number', filled: Boolean(p.personal?.phone?.trim()) },
          { field: 'nationality', label: 'Nationality', filled: Boolean(p.personal?.nationality?.trim()) },
          { field: 'countryOfResidence', label: 'Country of Residence', filled: Boolean(p.personal?.countryOfResidence?.trim()) },
          { field: 'currentCity', label: 'Current City', filled: Boolean(p.personal?.currentCity?.trim()) },
          { field: 'passportStatus', label: 'Passport Status', filled: Boolean(p.personal?.passportStatus) },
        ],
        [
          { field: 'dateOfBirth', label: 'Date of Birth', filled: Boolean(p.personal?.dateOfBirth) },
          { field: 'passportNumber', label: 'Passport Number', filled: Boolean(p.personal?.passportNumber) },
          { field: 'currentAddress', label: 'Current Address', filled: Boolean(p.personal?.currentAddress) },
        ]
      )
    );

    // Section B: Goals
    sections.push(
      evaluateSection(
        'goals',
        'Section B: Career / Education Goal',
        [
          { field: 'primaryPathway', label: 'Target Pathway', filled: Boolean(p.goals?.primaryPathway) },
          { field: 'preferredFieldOrIndustry', label: 'Field / Industry', filled: Boolean(p.goals?.preferredFieldOrIndustry?.trim()) },
          { field: 'expectedTimeline', label: 'Application Timeline', filled: Boolean(p.goals?.expectedTimeline?.trim()) },
          { field: 'intendedIntakeYear', label: 'Intended Intake Year', filled: Boolean(p.goals?.intendedIntakeYear?.trim()) },
          { field: 'readinessStatus', label: 'Readiness Status', filled: Boolean(p.goals?.readinessStatus) },
        ],
        [
          { field: 'secondaryPathway', label: 'Secondary Goal', filled: Boolean(p.goals?.secondaryPathway) },
          { field: 'preferredCitiesOrRegions', label: 'Preferred German Cities', filled: Boolean(p.goals?.preferredCitiesOrRegions?.length) },
        ]
      )
    );

    // Section C: Academic Background
    sections.push(
      evaluateSection(
        'academic',
        'Section C: Academic Background',
        [
          { field: 'highestCompletedQualification', label: 'Highest Completed Qualification', filled: Boolean(p.academic?.highestCompletedQualification?.trim()) },
          { field: 'degreeName', label: 'Degree Name', filled: Boolean(p.academic?.degreeName?.trim()) },
          { field: 'streamOrSpecialization', label: 'Specialization / Stream', filled: Boolean(p.academic?.streamOrSpecialization?.trim()) },
          { field: 'institutionName', label: 'Awarding College / University', filled: Boolean(p.academic?.institutionName?.trim()) },
          { field: 'countryOfEducation', label: 'Country of Education', filled: Boolean(p.academic?.countryOfEducation?.trim()) },
          { field: 'graduationYear', label: 'Graduation Year', filled: Boolean(p.academic?.graduationYear) },
          { field: 'scoreValue', label: 'CGPA / Percentage', filled: Boolean(p.academic?.scoreValue) },
          { field: 'gradingScale', label: 'Grading Scale', filled: Boolean(p.academic?.gradingScale) },
        ],
        [
          { field: 'previousEducationHistory', label: 'Previous School Education (10th/12th)', filled: Boolean(p.academic?.previousEducationHistory?.trim()) },
          { field: 'bachelorSubjects', label: 'Completed University Subjects (ECTS)', filled: Boolean(p.academic?.bachelorSubjects?.length) },
          { field: 'academicAchievements', label: 'Academic Honors & Awards', filled: Boolean(p.academic?.academicAchievements?.trim()) },
        ]
      )
    );

    // Section D: Languages
    sections.push(
      evaluateSection(
        'languages',
        'Section D: Language Proficiency',
        [
          { field: 'germanLevel', label: 'German Proficiency (CEFR)', filled: Boolean(p.languages?.germanLevel) },
          { field: 'englishLevel', label: 'English Proficiency', filled: Boolean(p.languages?.englishLevel) },
        ],
        [
          { field: 'germanExamType', label: 'German Certificate Exam (Goethe/TestDaF)', filled: Boolean(p.languages?.germanExamType && p.languages.germanExamType !== 'NONE') },
          { field: 'englishExamType', label: 'English Exam Type (IELTS/TOEFL)', filled: Boolean(p.languages?.englishExamType && p.languages.englishExamType !== 'NONE') },
          { field: 'expectedGermanExamDate', label: 'Target German Exam Date', filled: Boolean(p.languages?.expectedGermanExamDate) },
        ]
      )
    );

    // Section E: Entrance Exams
    sections.push(
      evaluateSection(
        'exams',
        'Section E: Entrance Exams & Qualifications',
        [],
        [
          { field: 'exams', label: 'Standardized Tests (GRE/GMAT/TestAS)', filled: Boolean(p.exams?.exams?.length) },
        ]
      )
    );

    // Section F: Work Experience & Skills
    sections.push(
      evaluateSection(
        'experience',
        'Section F: Work Experience & Skills',
        [
          { field: 'currentEmploymentStatus', label: 'Employment Status', filled: Boolean(p.experience?.currentEmploymentStatus) },
          { field: 'technicalSkills', label: 'Technical & Professional Skills', filled: Boolean(p.experience?.technicalSkills?.length) },
        ],
        [
          { field: 'jobs', label: 'Employment History / Job Roles', filled: Boolean(p.experience?.jobs?.length) },
          { field: 'internships', label: 'Internships', filled: Boolean(p.experience?.internships?.length) },
          { field: 'projects', label: 'Academic / Personal Projects', filled: Boolean(p.experience?.projects?.length) },
          { field: 'githubUrl', label: 'GitHub or Portfolio URL', filled: Boolean(p.experience?.githubUrl || p.experience?.portfolioUrl) },
        ]
      )
    );

    // Pathway-specific conditional section
    if (pathway === Pathway.STUDY) {
      sections.push(
        evaluateSection(
          'studyPrefs',
          'Section G: University Study Preferences',
          [
            { field: 'preferredDegreeLevel', label: 'Preferred Degree Level', filled: Boolean(p.studyPrefs?.preferredDegreeLevel) },
            { field: 'preferredSubject', label: 'Preferred Course Subject', filled: Boolean(p.studyPrefs?.preferredSubject?.trim()) },
            { field: 'desiredStartSemester', label: 'Desired Start Semester', filled: Boolean(p.studyPrefs?.desiredStartSemester?.trim()) },
            { field: 'maxTuitionBudgetEUR', label: 'Tuition Fee Budget', filled: p.studyPrefs?.maxTuitionBudgetEUR !== undefined },
            { field: 'monthlyLivingBudgetEUR', label: 'Monthly Living Budget', filled: p.studyPrefs?.monthlyLivingBudgetEUR !== undefined },
          ],
          [
            { field: 'preferredInstitutions', label: 'Preferred Universities', filled: Boolean(p.studyPrefs?.preferredInstitutions?.length) },
            { field: 'preferredStates', label: 'Preferred Federal States', filled: Boolean(p.studyPrefs?.preferredStates?.length) },
            { field: 'teachingLanguagePreference', label: 'Study Language (English/German)', filled: Boolean(p.studyPrefs?.teachingLanguagePreference) },
          ]
        )
      );
    } else if (pathway === Pathway.AUSBILDUNG) {
      sections.push(
        evaluateSection(
          'ausbildungPrefs',
          'Section H: Ausbildung Preferences',
          [
            { field: 'preferredOccupation', label: 'Preferred Ausbildung Occupation', filled: Boolean(p.ausbildungPrefs?.preferredOccupation?.trim()) },
            { field: 'preferredIndustry', label: 'Preferred Industry', filled: Boolean(p.ausbildungPrefs?.preferredIndustry?.trim()) },
            { field: 'desiredStartDate', label: 'Desired Start Date', filled: Boolean(p.ausbildungPrefs?.desiredStartDate?.trim()) },
          ],
          [
            { field: 'practicalExperience', label: 'Practical Experience Details', filled: Boolean(p.ausbildungPrefs?.practicalExperience?.trim()) },
            { field: 'expectedStipendEUR', label: 'Monthly Training Stipend Expectation', filled: p.ausbildungPrefs?.expectedStipendEUR !== undefined },
            { field: 'preferredLocations', label: 'Preferred German Cities / States', filled: Boolean(p.ausbildungPrefs?.preferredLocations?.length) },
          ]
        )
      );
    } else if (pathway === Pathway.EMPLOYMENT) {
      sections.push(
        evaluateSection(
          'employmentPrefs',
          'Section I: Employment Preferences',
          [
            { field: 'targetJobTitle', label: 'Target Job Title', filled: Boolean(p.employmentPrefs?.targetJobTitle?.trim()) },
            { field: 'targetIndustry', label: 'Preferred Industry', filled: Boolean(p.employmentPrefs?.targetIndustry?.trim()) },
            { field: 'preferredLocations', label: 'Preferred German Locations', filled: Boolean(p.employmentPrefs?.preferredLocations?.length) },
            { field: 'workAuthorizationStatus', label: 'Visa / Authorization Status', filled: Boolean(p.employmentPrefs?.workAuthorizationStatus) },
          ],
          [
            { field: 'expectedSalaryEUR', label: 'Expected Gross Annual Salary', filled: Boolean(p.employmentPrefs?.expectedSalaryEUR) },
            { field: 'noticePeriodDays', label: 'Notice Period / Availability', filled: Boolean(p.employmentPrefs?.noticePeriodDays) },
            { field: 'employmentType', label: 'Employment Contract Type', filled: Boolean(p.employmentPrefs?.employmentType) },
          ]
        )
      );
    }

    // Section J: Financial Planning & Scholarships
    sections.push(
      evaluateSection(
        'financial',
        'Section J: Financial Planning & Scholarships',
        [
          { field: 'annualBudgetEUR', label: 'Annual Education Budget', filled: p.financial?.annualBudgetEUR !== undefined },
          { field: 'monthlyLivingCostEUR', label: 'Monthly Living Cost Budget', filled: p.financial?.monthlyLivingCostEUR !== undefined },
          { field: 'financialProofMethod', label: 'Financial Proof Method', filled: Boolean(p.financial?.financialProofMethod) },
        ],
        [
          { field: 'scholarshipPreferences', label: 'Scholarship Interests', filled: Boolean(p.financial?.scholarshipPreferences?.length) },
          { field: 'sportsAchievements', label: 'Sports / Volunteering / Merit', filled: Boolean(p.financial?.sportsAchievements || p.financial?.extracurricularOrVolunteering) },
          { field: 'sensitiveDataConsent', label: 'Optional Scholarship Eligibility Consent', filled: Boolean(p.financial?.sensitiveDataConsent) },
        ]
      )
    );

    // Section K: Documents Checklist
    const docList = p.documents?.documents || [];
    const uploadedDocsCount = docList.filter((d) => d.uploadStatus === 'UPLOADED').length;
    const requiredDocs = ['DEGREE_CERTIFICATE', 'LANGUAGE_CERTIFICATE'];
    const missingDocs = requiredDocs.filter((reqType) => !docList.some((d) => d.documentType === reqType && d.uploadStatus === 'UPLOADED'));

    sections.push({
      sectionKey: 'documents',
      title: 'Section K: Documents & Checklist',
      status: missingDocs.length === 0 ? 'COMPLETED' : uploadedDocsCount > 0 ? 'IN_PROGRESS' : 'EMPTY',
      completionPct: Math.round(((requiredDocs.length - missingDocs.length) / requiredDocs.length) * 100),
      missingMandatoryCount: missingDocs.length,
      missingMandatoryFields: missingDocs.map((d) => d === 'DEGREE_CERTIFICATE' ? 'Degree Certificate' : 'German / English Language Certificate'),
      missingOptionalFields: ['Passport Copy', 'Official Curriculum Vitae (CV)'],
    });

    // Section L: Previous Applications
    sections.push(
      evaluateSection(
        'previousApps',
        'Section L: Previous Applications & Progress',
        [
          { field: 'applicationStage', label: 'Current Application Stage', filled: Boolean(p.previousApps?.applicationStage) },
        ],
        [
          { field: 'contactedInstitutions', label: 'Already Contacted Universities / Employers', filled: Boolean(p.previousApps?.contactedInstitutions?.trim()) },
          { field: 'mainChallenges', label: 'Primary Challenges Faced', filled: Boolean(p.previousApps?.mainChallenges?.trim()) },
        ]
      )
    );

    // Section M: Additional Information
    sections.push(
      evaluateSection(
        'additional',
        'Section M: Additional Information',
        [],
        [
          { field: 'additionalPreferences', label: 'Additional Preferences & Constraints', filled: Boolean(p.additional?.additionalPreferences?.trim()) },
          { field: 'additionalNotes', label: 'General Application Notes', filled: Boolean(p.additional?.additionalNotes?.trim()) },
        ]
      )
    );

    // Overall Completion Calculation (weighted by sections)
    const evaluatedSections = sections.filter((s) => s.sectionKey !== 'additional');
    const totalPctSum = evaluatedSections.reduce((acc, curr) => acc + curr.completionPct, 0);
    const overallCompletenessPct = Math.round(totalPctSum / evaluatedSections.length);

    const isReadyForSubmission = allMissingMandatory.length === 0 && missingDocs.length === 0;

    // Suggested Next Steps
    const suggestedNextSteps: { title: string; description: string; targetSection: string; ctaLabel: string }[] = [];
    if (allMissingMandatory.length > 0) {
      const firstMissing = allMissingMandatory[0];
      suggestedNextSteps.push({
        title: `Complete ${firstMissing.label}`,
        description: `This field in ${firstMissing.section} is mandatory for accurate German admission matching.`,
        targetSection: firstMissing.section,
        ctaLabel: 'Go to Section →',
      });
    }
    if (missingDocs.length > 0) {
      suggestedNextSteps.push({
        title: 'Upload Official Credentials',
        description: 'Degree and language certificates must be verified for Anabin H+ and German Embassy standards.',
        targetSection: 'Section K: Documents & Checklist',
        ctaLabel: 'Upload Documents →',
      });
    }
    if (p.languages?.germanLevel === 'NONE' || p.languages?.germanLevel === 'A1') {
      suggestedNextSteps.push({
        title: 'Start German Preparation',
        description: 'Advancing to B1 opens 80%+ more program options and satisfies German student/work visa requirements.',
        targetSection: 'Section D: Language Proficiency',
        ctaLabel: 'Review Language Goals →',
      });
    }

    return {
      overallCompletenessPct,
      isReadyForSubmission,
      primaryPathway: pathway,
      sections,
      allMissingMandatory,
      allMissingOptional,
      documentsRequiredCount: requiredDocs.length,
      documentsUploadedCount: uploadedDocsCount,
      missingMandatoryDocuments: missingDocs,
      suggestedNextSteps,
    };
  }
}

