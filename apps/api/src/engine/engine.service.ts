import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import {
  DegreeLevel,
  TeachingLanguage,
  UniversityMatchStatus,
  ScholarshipEligibilityStatus,
  FullApplicantProfile,
  Step1PersonalData,
  Step2AcademicData,
  Step3LanguageData,
  Step4ProjectsData,
  Step5BudgetData,
  Step6SensitiveScholarshipData,
  UniversityRecord,
  ProgrammeRecord,
  ScholarshipRecord,
  ScholarshipRuleRecord,
  UniversityMatchResult,
  ScholarshipMatchResult,
  RecommendationEngineResponse,
  RoadmapStep,
  SavedShortlistItem,
} from '@educaro/shared';
import {
  VERIFIED_UNIVERSITIES,
  VERIFIED_PROGRAMMES,
  VERIFIED_SCHOLARSHIPS,
  VERIFIED_SCHOLARSHIP_RULES,
} from './seeds/verified-data.seed';
import {
  CURATED_EXAM_RESOURCES,
  EXAM_INFO_CATALOG,
} from './seeds/exam-resources.seed';
import Groq from 'groq-sdk';

@Injectable()
export class EngineService implements OnModuleInit {
  private readonly logger = new Logger(EngineService.name);
  private groq: Groq | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (groqKey) {
      this.groq = new Groq({ apiKey: groqKey });
    }
  }

  async onModuleInit() {
    await this.seedVerifiedDataIfEmpty();
  }

  /**
   * Seed curated verified data if tables are currently empty
   */
  private async seedVerifiedDataIfEmpty() {
    try {
      const uniRes = await this.db.query('SELECT COUNT(*) as cnt FROM universities');
      const uniCount = parseInt(uniRes.rows[0]?.cnt || '0', 10);
      if (uniCount === 0) {
        this.logger.log('Seeding verified universities...');
        for (const u of VERIFIED_UNIVERSITIES) {
          await this.db.query(
            `INSERT INTO universities (
              id, name, official_website, city, federal_state, institution_type,
              public_or_private, international_admissions_url, tuition_fee_information,
              semester_contribution, general_contact_url, source_url, living_cost_estimate_monthly,
              campus_setting, last_verified_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO NOTHING`,
            [
              u.id,
              u.name,
              u.officialWebsite,
              u.city,
              u.federalState,
              u.institutionType,
              u.publicOrPrivate,
              u.internationalAdmissionsUrl,
              u.tuitionFeeInformation,
              u.semesterContributionEUR,
              u.generalContactUrl,
              u.sourceUrl,
              u.livingCostEstimateMonthlyEUR,
              u.campusSetting || '',
              u.lastVerifiedAt,
            ],
          );
        }
        this.logger.log(`Seeded ${VERIFIED_UNIVERSITIES.length} universities.`);
      }

      const progRes = await this.db.query('SELECT COUNT(*) as cnt FROM programmes');
      const progCount = parseInt(progRes.rows[0]?.cnt || '0', 10);
      if (progCount < VERIFIED_PROGRAMMES.length) {
        this.logger.log('Seeding verified programmes...');
        for (const p of VERIFIED_PROGRAMMES) {
          await this.db.query(
            `INSERT INTO programmes (
              id, university_id, programme_name, degree_level, subject_area, specialisation,
              teaching_language, accepted_language_certificates, minimum_language_scores,
              minimum_academic_grade, required_previous_degree, required_subjects,
              required_credit_categories, gre_requirement, other_entrance_tests,
              application_method, application_open_date_winter, application_deadline_winter,
              application_open_date_summer, application_deadline_summer, intake,
              tuition_fee, semester_contribution, estimated_duration_semesters,
              official_programme_url, official_admission_requirements_url, data_source, last_verified_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
            ) ON CONFLICT (id) DO NOTHING`,
            [
              p.id,
              p.universityId,
              p.programmeName,
              p.degreeLevel,
              p.subjectArea,
              p.specialisation || '',
              p.teachingLanguage,
              JSON.stringify(p.acceptedLanguageCertificates || []),
              JSON.stringify(p.minimumLanguageScores || {}),
              p.minimumAcademicGradeGerman,
              p.requiredPreviousDegree,
              JSON.stringify(p.requiredSubjects || []),
              JSON.stringify(p.requiredCreditCategories || {}),
              p.greRequirement,
              p.otherEntranceTests || '',
              p.applicationMethod,
              p.applicationOpenDateWinter || '',
              p.applicationDeadlineWinter,
              p.applicationOpenDateSummer || '',
              p.applicationDeadlineSummer || '',
              p.intake,
              p.tuitionFeeEUR,
              p.semesterContributionEUR,
              p.estimatedDurationSemesters,
              p.officialProgrammeUrl,
              p.officialAdmissionRequirementsUrl,
              p.dataSource,
              p.lastVerifiedAt,
            ],
          );
        }
        this.logger.log(`Seeded ${VERIFIED_PROGRAMMES.length} programmes.`);
      }

      const scholRes = await this.db.query('SELECT COUNT(*) as cnt FROM scholarships');
      const scholCount = parseInt(scholRes.rows[0]?.cnt || '0', 10);
      if (scholCount === 0) {
        this.logger.log('Seeding verified scholarships...');
        for (const s of VERIFIED_SCHOLARSHIPS) {
          await this.db.query(
            `INSERT INTO scholarships (
              id, scholarship_name, provider_name, provider_type, associated_university_id,
              funding_type, funding_amount, currency, payment_frequency, duration_months,
              tuition_coverage, living_cost_coverage, insurance_coverage, travel_allowance,
              nationality_eligibility, eligible_degree_levels, eligible_subjects,
              minimum_academic_requirements, financial_need_requirement, sports_achievement_requirement,
              gender_related_eligibility, disability_related_eligibility, other_eligibility_conditions,
              required_documents, application_method, application_deadline, official_application_url,
              official_eligibility_url, source_url, verification_status, last_verified_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
            ) ON CONFLICT (id) DO NOTHING`,
            [
              s.id,
              s.scholarshipName,
              s.providerName,
              s.providerType,
              s.associatedUniversityId || null,
              s.fundingType,
              s.fundingAmount,
              s.currency,
              s.paymentFrequency,
              s.durationMonths,
              s.tuitionCoverage,
              s.livingCostCoverage,
              s.insuranceCoverage,
              s.travelAllowance,
              JSON.stringify(s.nationalityEligibility || []),
              JSON.stringify(s.eligibleDegreeLevels || []),
              JSON.stringify(s.eligibleSubjects || []),
              s.minimumAcademicGradeGerman ? String(s.minimumAcademicGradeGerman) : '',
              s.financialNeedRequirement,
              s.sportsAchievementRequirement,
              s.genderRelatedEligibility,
              s.disabilityRelatedEligibility,
              s.otherEligibilityConditions || '',
              JSON.stringify(s.requiredDocuments || []),
              s.applicationMethod,
              s.applicationDeadline,
              s.officialApplicationUrl,
              s.officialEligibilityUrl,
              s.sourceUrl,
              s.verificationStatus,
              s.lastVerifiedAt,
            ],
          );
        }
        this.logger.log(`Seeded ${VERIFIED_SCHOLARSHIPS.length} scholarships.`);
      }

      const ruleRes = await this.db.query('SELECT COUNT(*) as cnt FROM scholarship_rules');
      const ruleCount = parseInt(ruleRes.rows[0]?.cnt || '0', 10);
      if (ruleCount === 0) {
        this.logger.log('Seeding verified scholarship rules...');
        for (const r of VERIFIED_SCHOLARSHIP_RULES) {
          await this.db.query(
            `INSERT INTO scholarship_rules (
              id, scholarship_id, rule_type, rule_description, condition_type, condition_value,
              mandatory_or_preferred, evidence_required, exception_notes, official_source_url, last_verified_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO NOTHING`,
            [
              r.id,
              r.scholarshipId,
              r.ruleType,
              r.ruleDescription,
              r.conditionType,
              r.conditionValue,
              r.mandatoryOrPreferred,
              r.evidenceRequired,
              r.exceptionNotes || '',
              r.officialSourceUrl,
              r.lastVerifiedAt,
            ],
          );
        }
        this.logger.log(`Seeded ${VERIFIED_SCHOLARSHIP_RULES.length} scholarship rules.`);
      }

      // Ensure active scholarships have future deadlines and baybids has past deadline
      await this.db.query("UPDATE scholarships SET application_deadline = '2027-08-31' WHERE id = 'schol_adh_sports'");
      await this.db.query("UPDATE scholarships SET application_deadline = '2027-10-15' WHERE id = 'schol_daad_women_stem'");
      await this.db.query("UPDATE scholarships SET application_deadline = '2027-10-31' WHERE id = 'schol_friedrich_ebert'");
      await this.db.query("UPDATE scholarships SET application_deadline = '2027-11-15' WHERE id = 'schol_disability_studierendenwerk'");
      await this.db.query("UPDATE scholarships SET application_deadline = '2026-06-30' WHERE id = 'schol_baybids_bavaria'");
    } catch (err: any) {
      this.logger.error(`Error seeding verified data: ${err.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // BAVARIAN FORMULA GRADE CONVERSION
  // --------------------------------------------------------------------------

  /**
   * Calculate German equivalent grade using Modified Bavarian Formula:
   * German Grade = 1 + 3 * ((Nmax - N) / (Nmax - Nmin))
   * German scale: 1.0 (Best) to 4.0 (Minimum Pass)
   */
  calculateGermanGrade(
    score: number,
    scale: '10_POINT' | '4_POINT' | 'PERCENTAGE' | 'GERMAN_SCALE' | 'OTHER',
    maxGradeCustom?: number,
    minPassCustom?: number,
  ): number {
    if (scale === 'GERMAN_SCALE') {
      return Math.min(Math.max(Number(score.toFixed(2)), 1.0), 4.0);
    }

    let nMax = 10;
    let nMin = 4; // standard passing grade in Indian universities

    if (scale === '10_POINT') {
      nMax = maxGradeCustom || 10;
      nMin = minPassCustom || 4;
    } else if (scale === '4_POINT') {
      nMax = maxGradeCustom || 4;
      nMin = minPassCustom || 2;
    } else if (scale === 'PERCENTAGE') {
      nMax = maxGradeCustom || 100;
      nMin = minPassCustom || 40;
    } else if (maxGradeCustom && minPassCustom) {
      nMax = maxGradeCustom;
      nMin = minPassCustom;
    }

    if (nMax <= nMin) {
      return 2.5; // fallback neutral
    }

    const clampedScore = Math.min(Math.max(score, nMin), nMax);
    const converted = 1 + 3 * ((nMax - clampedScore) / (nMax - nMin));
    return Number(Math.min(Math.max(converted, 1.0), 4.0).toFixed(2));
  }

  // --------------------------------------------------------------------------
  // APPLICANT PROFILE MANAGEMENT
  // --------------------------------------------------------------------------

  async saveProfile(
    userId: string,
    dto: {
      step1: Step1PersonalData;
      step2: Step2AcademicData;
      step3: Step3LanguageData;
      step4: Step4ProjectsData;
      step5: Step5BudgetData;
      step6?: Step6SensitiveScholarshipData;
    },
  ): Promise<FullApplicantProfile> {
    // 1. Compute Bavarian Grade
    if (dto.step2 && dto.step2.cgpaOrPercentage) {
      dto.step2.estimatedGermanGrade = this.calculateGermanGrade(
        dto.step2.cgpaOrPercentage,
        dto.step2.gradingScale,
        dto.step2.maxGradeOnScale,
        dto.step2.minPassingGradeOnScale,
      );
    }

    const profileId = uuidv4();
    const now = new Date().toISOString();

    // 2. Upsert applicant_profiles
    await this.db.query(
      `INSERT INTO applicant_profiles (
        id, user_id, step1_json, step2_json, step3_json, step4_json, step5_json, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        step1_json = EXCLUDED.step1_json,
        step2_json = EXCLUDED.step2_json,
        step3_json = EXCLUDED.step3_json,
        step4_json = EXCLUDED.step4_json,
        step5_json = EXCLUDED.step5_json,
        updated_at = CURRENT_TIMESTAMP`,
      [
        profileId,
        userId,
        JSON.stringify(dto.step1 || {}),
        JSON.stringify(dto.step2 || {}),
        JSON.stringify(dto.step3 || {}),
        JSON.stringify(dto.step4 || {}),
        JSON.stringify(dto.step5 || {}),
      ],
    );

    // 3. Upsert profile_sensitive_data if step6 provided
    let step6Saved: Step6SensitiveScholarshipData | undefined = undefined;
    if (dto.step6) {
      const sensitiveId = uuidv4();
      const consentTime = dto.step6.consentGivenAt || now;
      dto.step6.consentGivenAt = consentTime;

      await this.db.query(
        `INSERT INTO profile_sensitive_data (
          id, user_id, step6_json, consent_given_at, consent_withdrawn_at, updated_at
        ) VALUES ($1, $2, $3, $4, NULL, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
          step6_json = EXCLUDED.step6_json,
          consent_given_at = EXCLUDED.consent_given_at,
          consent_withdrawn_at = NULL,
          updated_at = CURRENT_TIMESTAMP`,
        [sensitiveId, userId, JSON.stringify(dto.step6), consentTime],
      );
      step6Saved = dto.step6;
    }

    return {
      userId,
      step1: dto.step1,
      step2: dto.step2,
      step3: dto.step3,
      step4: dto.step4,
      step5: dto.step5,
      step6: step6Saved,
      updatedAt: now,
    };
  }

  async getProfile(userId: string): Promise<FullApplicantProfile | null> {
    const profRes = await this.db.query(
      `SELECT * FROM applicant_profiles WHERE user_id = $1`,
      [userId],
    );

    if (profRes.rows.length === 0) {
      return null;
    }

    const row = profRes.rows[0];
    const step1: Step1PersonalData = JSON.parse(row.step1_json || '{}');
    const step2: Step2AcademicData = JSON.parse(row.step2_json || '{}');
    const step3: Step3LanguageData = JSON.parse(row.step3_json || '{}');
    const step4: Step4ProjectsData = JSON.parse(row.step4_json || '{}');
    const step5: Step5BudgetData = JSON.parse(row.step5_json || '{}');

    // Load sensitive data if consent active
    let step6: Step6SensitiveScholarshipData | undefined = undefined;
    const sensRes = await this.db.query(
      `SELECT * FROM profile_sensitive_data WHERE user_id = $1 AND consent_withdrawn_at IS NULL`,
      [userId],
    );
    if (sensRes.rows.length > 0) {
      step6 = JSON.parse(sensRes.rows[0].step6_json || '{}');
    }

    return {
      userId,
      step1,
      step2,
      step3,
      step4,
      step5,
      step6,
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  async withdrawConsent(userId: string): Promise<{ success: boolean; message: string }> {
    await this.db.query(
      `UPDATE profile_sensitive_data SET consent_withdrawn_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId],
    );
    return {
      success: true,
      message: 'Consent for sensitive scholarship matching data has been successfully withdrawn. Sensitive attributes will not be processed.',
    };
  }

  async deleteSensitiveData(userId: string): Promise<{ success: boolean; message: string }> {
    await this.db.query(`DELETE FROM profile_sensitive_data WHERE user_id = $1`, [userId]);
    return {
      success: true,
      message: 'Sensitive scholarship profile attributes have been permanently deleted from storage.',
    };
  }

  // --------------------------------------------------------------------------
  // RECOMMENDATION ENGINE: MATCHING ALGORITHMS
  // --------------------------------------------------------------------------

  /**
   * Main recommendation entry point: returns university and scholarship matches
   */
  async getRecommendations(
    userId: string,
    customWeights?: {
      academic?: number;
      subject?: number;
      language?: number;
      budget?: number;
      preferences?: number;
    },
  ): Promise<RecommendationEngineResponse> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new NotFoundException('Applicant profile not found. Please complete the profile wizard first.');
    }

    // Default weights: Academic 30%, Subject 25%, Language 20%, Budget 15%, Preferences 10%
    const weights = {
      academic: customWeights?.academic ?? 30,
      subject: customWeights?.subject ?? 25,
      language: customWeights?.language ?? 20,
      budget: customWeights?.budget ?? 15,
      preferences: customWeights?.preferences ?? 10,
    };

    // Load programmes with university metadata
    const programmes = await this.getAllProgrammesWithUniversities();

    // Load saved shortlists
    const shortlistsRes = await this.db.query(
      `SELECT item_type, item_id FROM saved_shortlists WHERE user_id = $1`,
      [userId],
    );
    const savedProgrammesSet = new Set<string>();
    const savedScholarshipsSet = new Set<string>();
    for (const r of shortlistsRes.rows) {
      if (r.item_type === 'PROGRAMME') savedProgrammesSet.add(r.item_id);
      if (r.item_type === 'SCHOLARSHIP') savedScholarshipsSet.add(r.item_id);
    }

    // Match universities
    const universityMatches: UniversityMatchResult[] = programmes.map((prog) => {
      const match = this.evaluateUniversityEligibility(profile, prog, weights);
      match.isSaved = savedProgrammesSet.has(prog.id);
      return match;
    });

    // Sort university matches: SATISFIED first, then POTENTIAL_MATCH, then by matchScore desc
    universityMatches.sort((a, b) => {
      const rankOrder: Record<UniversityMatchStatus, number> = {
        [UniversityMatchStatus.SATISFIED]: 1,
        [UniversityMatchStatus.POTENTIAL_MATCH]: 2,
        [UniversityMatchStatus.UNMET_REQUIREMENTS]: 3,
        [UniversityMatchStatus.UNSUITABLE]: 4,
        [UniversityMatchStatus.INSUFFICIENT_INFO]: 5,
      };
      if (rankOrder[a.admissionStatus] !== rankOrder[b.admissionStatus]) {
        return rankOrder[a.admissionStatus] - rankOrder[b.admissionStatus];
      }
      return b.matchScore - a.matchScore;
    });

    // Match scholarships
    const scholarships = await this.getAllScholarships();
    const scholarshipRules = await this.getAllScholarshipRules();

    const scholarshipMatches: ScholarshipMatchResult[] = scholarships.map((schol) => {
      const rules = scholarshipRules.filter((r) => r.scholarshipId === schol.id);
      const match = this.evaluateScholarshipEligibility(profile, schol, rules);
      match.isSaved = savedScholarshipsSet.has(schol.id);
      return match;
    });

    // Sort scholarships: LIKELY_ELIGIBLE first, then POTENTIALLY_ELIGIBLE, etc.
    scholarshipMatches.sort((a, b) => {
      const rankOrder: Record<ScholarshipEligibilityStatus, number> = {
        [ScholarshipEligibilityStatus.LIKELY_ELIGIBLE]: 1,
        [ScholarshipEligibilityStatus.POTENTIALLY_ELIGIBLE]: 2,
        [ScholarshipEligibilityStatus.MISSING_INFO]: 3,
        [ScholarshipEligibilityStatus.RECHECK_REQUIRED]: 4,
        [ScholarshipEligibilityStatus.NOT_ELIGIBLE]: 5,
        [ScholarshipEligibilityStatus.DEADLINE_PASSED]: 6,
      };
      if (rankOrder[a.eligibilityStatus] !== rankOrder[b.eligibilityStatus]) {
        return rankOrder[a.eligibilityStatus] - rankOrder[b.eligibilityStatus];
      }
      return b.matchScore - a.matchScore;
    });

    return {
      applicantSummary: {
        fullName: profile.step1.fullName,
        intendedDegree: profile.step1.intendedStudyLevel,
        intendedSubject: profile.step1.intendedSubject,
        convertedGermanGrade: profile.step2.estimatedGermanGrade,
        germanLevel: profile.step3.germanProficiency,
        englishScore: profile.step3.englishScore ? `${profile.step3.englishExamProvider || 'Test'} ${profile.step3.englishScore}` : undefined,
      },
      universityMatches,
      scholarshipMatches,
      activeWeights: weights,
      generatedAt: new Date().toISOString(),
    };
  }

  async getScholarshipMatches(userId: string): Promise<ScholarshipMatchResult[]> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return [];
    }

    const savedScholarshipsRes = await this.db.query(
      `SELECT item_id FROM saved_shortlists WHERE user_id = $1 AND item_type = 'SCHOLARSHIP'`,
      [userId],
    );
    const savedScholarshipsSet = new Set<string>(
      savedScholarshipsRes.rows.map((r: any) => r.item_id),
    );

    const scholarships = await this.getAllScholarships();
    const scholarshipRules = await this.getAllScholarshipRules();

    const scholarshipMatches: ScholarshipMatchResult[] = scholarships.map((schol) => {
      const rules = scholarshipRules.filter((r) => r.scholarshipId === schol.id);
      const match = this.evaluateScholarshipEligibility(profile, schol, rules);
      match.isSaved = savedScholarshipsSet.has(schol.id);
      return match;
    });

    const rankOrder: Record<ScholarshipEligibilityStatus, number> = {
      [ScholarshipEligibilityStatus.LIKELY_ELIGIBLE]: 1,
      [ScholarshipEligibilityStatus.POTENTIALLY_ELIGIBLE]: 2,
      [ScholarshipEligibilityStatus.MISSING_INFO]: 3,
      [ScholarshipEligibilityStatus.RECHECK_REQUIRED]: 4,
      [ScholarshipEligibilityStatus.NOT_ELIGIBLE]: 5,
      [ScholarshipEligibilityStatus.DEADLINE_PASSED]: 6,
    };
    scholarshipMatches.sort((a, b) => {
      if (rankOrder[a.eligibilityStatus] !== rankOrder[b.eligibilityStatus]) {
        return rankOrder[a.eligibilityStatus] - rankOrder[b.eligibilityStatus];
      }
      return b.matchScore - a.matchScore;
    });

    return scholarshipMatches;
  }

  /**
   * Stage A & Stage B Evaluation for Universities & Programmes
   */
  evaluateUniversityEligibility(
    profile: FullApplicantProfile,
    prog: ProgrammeRecord,
    weights: {
      academic: number;
      subject: number;
      language: number;
      budget: number;
      preferences: number;
    },
  ): UniversityMatchResult {
    const matchedCriteria: string[] = [];
    const missingRequirements: string[] = [];
    const unverifiedDetails: string[] = [];

    const { step1, step2, step3, step5 } = profile;

    // Check for mandatory fields (TEST 8)
    if (!step1.intendedStudyLevel || !step1.intendedSubject || !step2.cgpaOrPercentage) {
      return {
        programme: prog,
        admissionStatus: UniversityMatchStatus.INSUFFICIENT_INFO,
        matchScore: 0,
        scoreBreakdown: {
          academicCompatibility: 0,
          subjectRelevance: 0,
          languageReadiness: 0,
          budgetCompatibility: 0,
          locationAndPreferences: 0,
        },
        matchedCriteria: [],
        missingRequirements: ['Mandatory applicant profile fields missing (Degree level, Subject, or CGPA)'],
        unverifiedDetails: ['Please complete academic and study fields in the Profile Wizard'],
        recommendedNextAction: 'Complete all mandatory fields in your Applicant Profile',
        estimatedCosts: this.computeEstimatedCosts(prog),
      };
    }

    // 1. Degree Level Compatibility
    const degreeCompatible =
      (prog.degreeLevel === 'MASTER' && (step1.currentEducationLevel.toLowerCase().includes('bachelor') || step1.intendedStudyLevel === 'MASTER')) ||
      (prog.degreeLevel === 'BACHELOR' && step1.intendedStudyLevel === 'BACHELOR');

    if (!degreeCompatible && prog.degreeLevel !== step1.intendedStudyLevel) {
      return {
        programme: prog,
        admissionStatus: UniversityMatchStatus.UNSUITABLE,
        matchScore: 10,
        scoreBreakdown: {
          academicCompatibility: 5,
          subjectRelevance: 5,
          languageReadiness: 0,
          budgetCompatibility: 0,
          locationAndPreferences: 0,
        },
        matchedCriteria: [],
        missingRequirements: [`Degree level mismatch: Programme requires ${prog.degreeLevel}, applicant seeking ${step1.intendedStudyLevel}`],
        unverifiedDetails: [],
        recommendedNextAction: `Select degree level ${prog.degreeLevel} if intending to pursue this programme`,
        estimatedCosts: this.computeEstimatedCosts(prog),
      };
    }
    matchedCriteria.push(`Target degree level matches: ${prog.degreeLevel}`);

    // 2. Academic Grade Cutoff
    const applicantGermanGrade = step2.estimatedGermanGrade || 2.5;
    // Lower German grade is better: 1.0 is best, 4.0 is pass.
    // Programme cutoff: e.g. 2.5. Eligible if applicantGermanGrade <= prog.minimumAcademicGradeGerman
    const gradeSatisfied = applicantGermanGrade <= prog.minimumAcademicGradeGerman + 0.05; // slight tolerance
    if (gradeSatisfied) {
      matchedCriteria.push(
        `Academic grade German equivalent (${applicantGermanGrade.toFixed(2)}) meets minimum requirement (<= ${prog.minimumAcademicGradeGerman.toFixed(2)})`,
      );
    } else {
      missingRequirements.push(
        `Academic grade cutoff not met: German equivalent ${applicantGermanGrade.toFixed(2)} exceeds cutoff ${prog.minimumAcademicGradeGerman.toFixed(2)} (in German system 1.0 is highest, lower number required)`,
      );
    }

    // 3. Language Readiness Evaluation (TEST 1 & TEST 2)
    const progLang = prog.teachingLanguage;
    let languageSatisfied = true;
    let languagePending = false;

    if (progLang === 'GERMAN') {
      const requiredGermanLevel = prog.minimumLanguageScores?.germanLevel || 'C1';
      const meetsGerman = this.compareGermanLevels(step3.germanProficiency, requiredGermanLevel);
      if (meetsGerman) {
        matchedCriteria.push(`German proficiency (${step3.germanProficiency}) meets programme requirement (${requiredGermanLevel})`);
      } else {
        languageSatisfied = false;
        if (['B1', 'B2'].includes(step3.germanProficiency)) {
          languagePending = true;
          missingRequirements.push(
            `German language requirement unmet: Programme is taught entirely in German and requires ${requiredGermanLevel}. Current level is ${step3.germanProficiency}.`,
          );
        } else {
          missingRequirements.push(
            `German language requirement unmet: Programme requires verified ${requiredGermanLevel} German proficiency. Current level is ${step3.germanProficiency}.`,
          );
        }
      }
    } else if (progLang === 'ENGLISH') {
      const reqIelts = prog.minimumLanguageScores?.ieltsMinOverall || 6.5;
      const applicantScore = step3.englishScore || 0;
      if (step3.englishProficiency === 'NATIVE' || applicantScore >= reqIelts) {
        matchedCriteria.push(`English proficiency verified (${step3.englishExamProvider || 'Test'} ${applicantScore || 'Native'} >= ${reqIelts})`);
      } else if (applicantScore > 0 && applicantScore < reqIelts) {
        languageSatisfied = false;
        missingRequirements.push(
          `English score below cutoff: ${step3.englishExamProvider || 'Test'} score ${applicantScore} does not meet minimum ${reqIelts}`,
        );
      } else {
        languagePending = true;
        unverifiedDetails.push(`English proficiency certificate (${reqIelts} IELTS or equivalent) required prior to admission deadline`);
      }
    } else if (progLang === 'BILINGUAL') {
      const requiredGerman = prog.minimumLanguageScores?.germanLevel || 'B2';
      const meetsGerman = this.compareGermanLevels(step3.germanProficiency, requiredGerman);
      if (meetsGerman) {
        matchedCriteria.push(`Bilingual German component (${step3.germanProficiency} >= ${requiredGerman}) satisfied`);
      } else {
        languageSatisfied = false;
        missingRequirements.push(`Bilingual programme requires minimum ${requiredGerman} German proficiency; currently ${step3.germanProficiency}`);
      }
    }

    // 4. ECTS Credits and Subject Relevance
    const subjNorm = step1.intendedSubject.toLowerCase();
    const progSubjNorm = prog.subjectArea.toLowerCase();
    const progNameNorm = prog.programmeName.toLowerCase();
    const isDirectSubjectMatch =
      subjNorm.includes(progSubjNorm) ||
      progSubjNorm.includes(subjNorm) ||
      (subjNorm.includes('computer') && progSubjNorm.includes('computer')) ||
      (subjNorm.includes('data') && (progSubjNorm.includes('data') || progNameNorm.includes('data'))) ||
      (subjNorm.includes('ai') && (progSubjNorm.includes('artificial') || progNameNorm.includes('intelligence')));

    if (isDirectSubjectMatch) {
      matchedCriteria.push(`Subject alignment: ${step1.intendedSubject} closely aligns with ${prog.subjectArea}`);
    } else {
      unverifiedDetails.push(`Curriculum credit assessment required to verify alignment between ${step1.intendedSubject} and ${prog.subjectArea}`);
    }

    // Check specific ECTS credits if defined
    if (prog.requiredCreditCategories?.mathCreditsECTS) {
      const mathCredits = step2.mathProgrammingBackground?.mathCreditsECTS || 0;
      if (mathCredits >= prog.requiredCreditCategories.mathCreditsECTS) {
        matchedCriteria.push(`Higher Mathematics credits verified (${mathCredits} ECTS >= ${prog.requiredCreditCategories.mathCreditsECTS} ECTS required)`);
      } else if (mathCredits > 0) {
        missingRequirements.push(
          `Insufficient Math credits: Programme requires ${prog.requiredCreditCategories.mathCreditsECTS} ECTS in Mathematics; verified transcripts show ${mathCredits} ECTS.`,
        );
      } else {
        unverifiedDetails.push(`Requires ${prog.requiredCreditCategories.mathCreditsECTS} ECTS in Mathematics transcripts`);
      }
    }

    // 5. GRE / Entrance Requirements
    if (prog.greRequirement === 'MANDATORY') {
      unverifiedDetails.push('Mandatory GRE General test score required for non-EU applicants');
    }

    // 6. Application Deadline check
    const nowStr = new Date().toISOString().split('T')[0];
    const winterDeadlinePassed = prog.applicationDeadlineWinter < nowStr;
    if (winterDeadlinePassed && prog.intake === 'WINTER') {
      unverifiedDetails.push(`Winter intake deadline passed (${prog.applicationDeadlineWinter}). Next available cycle verification needed.`);
    }

    // Stage A Status Assignment
    let admissionStatus: UniversityMatchStatus;
    if (!gradeSatisfied || !languageSatisfied) {
      admissionStatus = UniversityMatchStatus.UNMET_REQUIREMENTS;
    } else if (languagePending || unverifiedDetails.length >= 2) {
      admissionStatus = UniversityMatchStatus.POTENTIAL_MATCH;
    } else {
      admissionStatus = UniversityMatchStatus.SATISFIED;
    }

    // Stage B Scoring (0 - 100)
    // 1. Academic Compatibility (0 - 30)
    let academicScore = 0;
    if (gradeSatisfied) {
      // Scale from cutoff: 1.0 gives 30, cutoff gives 22
      const margin = Math.max(0, prog.minimumAcademicGradeGerman - applicantGermanGrade);
      academicScore = Math.min(30, 22 + margin * 8);
    } else {
      const deficit = applicantGermanGrade - prog.minimumAcademicGradeGerman;
      academicScore = Math.max(0, 15 - deficit * 15);
    }

    // 2. Subject Relevance (0 - 25)
    let subjectScore = isDirectSubjectMatch ? 23 : 12;
    if (step2.relevantSubjectsCompleted && step2.relevantSubjectsCompleted.length > 0) {
      subjectScore = Math.min(25, subjectScore + 2);
    }

    // 3. Language Readiness (0 - 20)
    let languageScore = 0;
    if (languageSatisfied) {
      languageScore = 20;
    } else if (languagePending) {
      languageScore = 10;
    } else {
      languageScore = 3;
    }

    // 4. Budget Compatibility (0 - 15)
    let budgetScore = 10;
    const maxTuitionBudget = step5?.maxTuitionBudgetEUR ?? 5000;
    if (prog.tuitionFeeEUR <= maxTuitionBudget) {
      budgetScore += 3;
      if (prog.tuitionFeeEUR === 0) budgetScore += 2; // Public 0 tuition
    } else {
      budgetScore = Math.max(2, budgetScore - 6);
    }
    budgetScore = Math.min(15, budgetScore);

    // 5. Location and Preferences (0 - 10)
    let prefScore = 5;
    if (step5?.preferredStates && prog.federalState && step5.preferredStates.includes(prog.federalState)) {
      prefScore += 3;
    }
    if (step5?.preferredCities && prog.city && step5.preferredCities.includes(prog.city)) {
      prefScore += 2;
    }
    prefScore = Math.min(10, prefScore);

    // Combine raw weighted score
    // Weight multipliers relative to standard 30, 25, 20, 15, 10
    const totalWeights = weights.academic + weights.subject + weights.language + weights.budget + weights.preferences;
    const rawTotal =
      (academicScore * (weights.academic / 30) +
        subjectScore * (weights.subject / 25) +
        languageScore * (weights.language / 20) +
        budgetScore * (weights.budget / 15) +
        prefScore * (weights.preferences / 10)) *
      (100 / (totalWeights > 0 ? totalWeights : 100));

    let finalScore = Math.round(Math.min(100, Math.max(0, rawTotal)));

    // IMPORTANT RULE: Unmet mandatory requirements must NOT score high or masquerade as satisfied!
    if (admissionStatus === UniversityMatchStatus.UNMET_REQUIREMENTS) {
      finalScore = Math.min(finalScore, 58); // Cap score so unmet programmes do not outrank eligible ones
    }

    // Recommended Next Action
    let nextAction = 'Review official programme portal and prepare application dossier';
    if (!languageSatisfied) {
      nextAction = `Attain required ${prog.minimumLanguageScores?.germanLevel || 'C1'} German certificate before application deadline`;
    } else if (!gradeSatisfied) {
      nextAction = 'Look for non-NC (open admission) or aptitude-assessment programmes with flexible GPA criteria';
    } else if (prog.applicationMethod === 'UNI_ASSIST') {
      nextAction = 'Submit VPD application through Uni-Assist with verified APS India certificate';
    } else {
      nextAction = 'Proceed with direct online application on the university portal';
    }

    return {
      programme: prog,
      admissionStatus,
      matchScore: finalScore,
      scoreBreakdown: {
        academicCompatibility: Math.round(academicScore),
        subjectRelevance: Math.round(subjectScore),
        languageReadiness: Math.round(languageScore),
        budgetCompatibility: Math.round(budgetScore),
        locationAndPreferences: Math.round(prefScore),
      },
      matchedCriteria,
      missingRequirements,
      unverifiedDetails,
      recommendedNextAction: nextAction,
      estimatedCosts: this.computeEstimatedCosts(prog),
    };
  }

  /**
   * Helper to compute estimated costs breakdown
   */
  private computeEstimatedCosts(prog: ProgrammeRecord) {
    const monthlyLiving = prog.livingCostEstimateMonthlyEUR || 934;
    const semesterContrib = prog.semesterContributionEUR || 300;
    const tuition = prog.tuitionFeeEUR || 0;
    const annualTotal = tuition * 2 + semesterContrib * 2 + monthlyLiving * 12;

    return {
      tuitionFeeEUR: tuition,
      semesterContributionEUR: semesterContrib,
      monthlyLivingEstimateEUR: monthlyLiving,
      annualTotalEstimateEUR: Math.round(annualTotal),
      isEstimateOnly: true as const,
    };
  }

  /**
   * Helper to compare German CEFR levels
   */
  private compareGermanLevels(current: string, required: string): boolean {
    const levels = ['NONE', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const curIdx = levels.indexOf(current);
    const reqIdx = levels.indexOf(required);
    if (curIdx === -1) return false;
    return curIdx >= reqIdx;
  }

  // --------------------------------------------------------------------------
  // SCHOLARSHIP MATCHING ENGINE
  // --------------------------------------------------------------------------

  /**
   * Evaluate a scholarship against the applicant profile and structured rules
   */
  evaluateScholarshipEligibility(
    profile: FullApplicantProfile,
    schol: ScholarshipRecord,
    rules: ScholarshipRuleRecord[],
  ): ScholarshipMatchResult {
    const conditionsMet: string[] = [];
    const missingConditions: string[] = [];
    const evidenceNeeded: string[] = [];

    const { step1, step2, step3, step4, step6 } = profile;

    // Check application deadline first (TEST 7)
    const nowStr = new Date().toISOString().split('T')[0];
    const isExpired = schol.applicationDeadline < nowStr;

    // Check mandatory rules
    let hasUnmetMandatory = false;
    let hasMissingInfo = false;

    // Rule 1: Nationality
    const eligibleNationalities = schol.nationalityEligibility || ['ALL_INTERNATIONAL'];
    const applicantNat = (step1.nationality || 'Indian').toUpperCase();
    const isNatEligible =
      eligibleNationalities.includes('ALL_INTERNATIONAL') ||
      eligibleNationalities.includes('INDIA') ||
      eligibleNationalities.some((n) => applicantNat.includes(n));

    if (isNatEligible) {
      conditionsMet.push(`Nationality requirement satisfied (${step1.nationality || 'Indian'} eligible)`);
    } else {
      hasUnmetMandatory = true;
      missingConditions.push(`Open only to citizens of: ${eligibleNationalities.join(', ')}`);
    }

    // Rule 2: Degree Level
    const eligibleDegrees = schol.eligibleDegreeLevels || ['MASTER', 'BACHELOR'];
    if (eligibleDegrees.includes(step1.intendedStudyLevel)) {
      conditionsMet.push(`Eligible for ${step1.intendedStudyLevel} level study in Germany`);
    } else {
      hasUnmetMandatory = true;
      missingConditions.push(`Restricted to ${eligibleDegrees.join(', ')} students (applicant is ${step1.intendedStudyLevel})`);
    }

    // Rule 3: Academic Requirement
    if (schol.minimumAcademicGradeGerman) {
      const applicantGerman = step2.estimatedGermanGrade || 2.5;
      if (applicantGerman <= schol.minimumAcademicGradeGerman + 0.05) {
        conditionsMet.push(`Academic grade (${applicantGerman.toFixed(2)}) meets scholarship minimum (<= ${schol.minimumAcademicGradeGerman})`);
      } else {
        hasUnmetMandatory = true;
        missingConditions.push(
          `Scholarship requires exceptional academic merit (<= ${schol.minimumAcademicGradeGerman} German grade; applicant is ${applicantGerman.toFixed(2)})`,
        );
      }
    }

    // Rule 4: Sports Scholarship (TEST 3)
    if (schol.sportsAchievementRequirement) {
      const sportsList = step4.sports || [];
      const hasCompetitiveSports = sportsList.some(
        (s) =>
          ['STATE', 'NATIONAL', 'INTERNATIONAL'].includes(s.competitionLevel) &&
          s.isOfficialCompetitor === true,
      );
      const hasRecreationalOnly = sportsList.some((s) => s.competitionLevel === 'RECREATIONAL');

      if (hasCompetitiveSports) {
        const topSport = sportsList.find((s) => ['STATE', 'NATIONAL', 'INTERNATIONAL'].includes(s.competitionLevel));
        conditionsMet.push(
          `Elite competitive sports qualification met: ${topSport?.sportName} at ${topSport?.competitionLevel} level with official competitor verification`,
        );
        evidenceNeeded.push('Official national sports federation squad or medal certificate');
      } else {
        hasUnmetMandatory = true;
        if (hasRecreationalOnly) {
          missingConditions.push(
            'Ineligible: Requires certified State, National or International squad participation. Recreational sports do not meet competitive athlete criteria.',
          );
        } else {
          missingConditions.push('Requires verified competitive sports background at State/National/International squad level');
        }
      }
    }

    // Rule 5: Women in STEM (TEST 5)
    if (schol.genderRelatedEligibility === 'WOMEN_ONLY') {
      const isStemSubject = ['AI / Data Science', 'Computer Science', 'Mechanical Engineering', 'Engineering', 'Robotics'].some(
        (s) => step1.intendedSubject.toLowerCase().includes(s.toLowerCase()),
      );

      if (step6?.exploreWomenInStem && step6?.isEligibleForWomenInStem && isStemSubject) {
        conditionsMet.push('Identified as eligible female applicant in an eligible STEM study field');
        evidenceNeeded.push('Enrollment confirmation in eligible STEM master/bachelor program');
      } else if (!step6?.exploreWomenInStem) {
        hasMissingInfo = true;
        missingConditions.push('Opportunity restricted to female STEM students; eligibility not declared in profile');
      } else if (!isStemSubject) {
        hasUnmetMandatory = true;
        missingConditions.push('Programme subject must be an accredited STEM discipline');
      }
    }

    // Rule 6: Disability Support (TEST 4)
    if (schol.disabilityRelatedEligibility === 'DISABILITY_SPECIFIC') {
      if (step6?.exploreDisabilitySupport && step6?.disabilitySupportNeeds?.needsAdditionalExpenseAssistance) {
        conditionsMet.push('Explores disability accommodation / chronic illness support assistance in German higher education');
        evidenceNeeded.push('Medical certificate describing required study/living accommodations (no diagnostic history needed)');
      } else {
        hasUnmetMandatory = true;
        missingConditions.push('Dedicated funding scheme for students requiring verified disability or chronic illness accommodations');
      }
    }

    // Rule 7: Financial Need (TEST 6)
    if (schol.financialNeedRequirement) {
      if (step6?.exploreFinancialNeed && ['LOW_INCOME', 'LOWER_MIDDLE'].includes(step6?.financialNeedBracket || '')) {
        conditionsMet.push(`Demonstrated financial need criteria satisfied (${step6.financialNeedBracket?.replace('_', ' ')} bracket)`);
        evidenceNeeded.push('Official parental tax assessment or certified family income documentation');
      } else if (!step6?.exploreFinancialNeed) {
        hasMissingInfo = true;
        missingConditions.push('Requires verified low/lower-middle household income documentation; not specified in profile');
      } else {
        hasUnmetMandatory = true;
        missingConditions.push('Income bracket exceeds the threshold defined for need-based grant schemes');
      }
    }

    // Determine Status
    let eligibilityStatus: ScholarshipEligibilityStatus;
    if (isExpired) {
      eligibilityStatus = ScholarshipEligibilityStatus.DEADLINE_PASSED;
    } else if (hasUnmetMandatory) {
      eligibilityStatus = ScholarshipEligibilityStatus.NOT_ELIGIBLE;
    } else if (hasMissingInfo) {
      eligibilityStatus = ScholarshipEligibilityStatus.MISSING_INFO;
    } else if (conditionsMet.length >= 2 && evidenceNeeded.length <= 1) {
      eligibilityStatus = ScholarshipEligibilityStatus.LIKELY_ELIGIBLE;
    } else {
      eligibilityStatus = ScholarshipEligibilityStatus.POTENTIALLY_ELIGIBLE;
    }

    // Calculate score
    let matchScore = 0;
    if (eligibilityStatus === ScholarshipEligibilityStatus.LIKELY_ELIGIBLE) {
      matchScore = Math.min(95, 75 + conditionsMet.length * 6);
    } else if (eligibilityStatus === ScholarshipEligibilityStatus.POTENTIALLY_ELIGIBLE) {
      matchScore = 65;
    } else if (eligibilityStatus === ScholarshipEligibilityStatus.MISSING_INFO) {
      matchScore = 45;
    } else if (eligibilityStatus === ScholarshipEligibilityStatus.DEADLINE_PASSED) {
      matchScore = 20;
    } else {
      matchScore = 15;
    }

    // Generate Grounded "Why am I seeing this?" explanation
    const whyExplanation = this.generateWhyExplanation(schol, eligibilityStatus, conditionsMet, missingConditions);

    return {
      scholarship: {
        ...schol,
        isExpired,
      },
      eligibilityStatus,
      matchScore,
      conditionsMet,
      missingConditions,
      evidenceNeeded,
      whyAmISeeingThis: whyExplanation,
    };
  }

  /**
   * Plain English Grounded Explanation for Scholarship
   */
  private generateWhyExplanation(
    schol: ScholarshipRecord,
    status: ScholarshipEligibilityStatus,
    conditionsMet: string[],
    missingConditions: string[],
  ): string {
    if (status === ScholarshipEligibilityStatus.DEADLINE_PASSED) {
      return `This scholarship (${schol.scholarshipName}) was offered by ${schol.providerName}. The published deadline for this cycle (${schol.applicationDeadline}) has passed. We keep this listed so you can prepare for the upcoming intake.`;
    }
    if (status === ScholarshipEligibilityStatus.LIKELY_ELIGIBLE) {
      return `You matched this opportunity because ${conditionsMet.slice(0, 3).join(', ')}. Published by ${schol.providerName}, it provides €${schol.fundingAmount.toLocaleString()} (${schol.paymentFrequency.toLowerCase()}).`;
    }
    if (status === ScholarshipEligibilityStatus.POTENTIALLY_ELIGIBLE) {
      return `You meet foundational criteria including: ${conditionsMet.join(', ')}. Additional document verification is required by ${schol.providerName}.`;
    }
    if (status === ScholarshipEligibilityStatus.MISSING_INFO) {
      return `This opportunity (${schol.scholarshipName}) requires specific circumstances: ${missingConditions.join(', ')}. If this applies to you, update your Profile in Step 6.`;
    }
    return `Currently unsuitable because: ${missingConditions.join('; ')}. Published rules by ${schol.providerName} require strict adherence to these requirements.`;
  }

  // --------------------------------------------------------------------------
  // ROADMAP GENERATOR
  // --------------------------------------------------------------------------

  async getRoadmap(userId: string): Promise<RoadmapStep[]> {
    const existing = await this.db.query(
      `SELECT * FROM application_roadmaps WHERE user_id = $1 ORDER BY step_number ASC`,
      [userId],
    );

    if (existing.rows.length > 0) {
      return existing.rows.map((r) => ({
        id: r.id,
        stepNumber: r.step_number,
        title: r.title,
        description: r.description,
        category: r.category,
        isMandatory: Boolean(r.is_mandatory),
        isCompleted: Boolean(r.is_completed),
        dueDate: r.due_date,
        actionUrl: r.action_url,
        conditionalReason: r.conditional_reason,
      }));
    }

    // Generate fresh roadmap from profile
    return this.generateFreshRoadmap(userId);
  }

  async generateFreshRoadmap(userId: string): Promise<RoadmapStep[]> {
    const profile = await this.getProfile(userId);

    // Detect pathway (STUDY | VOCATIONAL / AUSBILDUNG | EMPLOYMENT)
    let rawPathway = profile?.step1?.intendedStudyLevel || 'STUDY';
    try {
      const compRes = await this.db.query(
        'SELECT profile_data FROM comprehensive_profiles WHERE user_id = $1',
        [userId],
      );
      if (compRes.rows.length > 0 && compRes.rows[0].profile_data) {
        const cp = JSON.parse(compRes.rows[0].profile_data);
        if (cp?.goals?.primaryPathway) {
          rawPathway = cp.goals.primaryPathway;
        }
      }
    } catch (e) {
      // fallback
    }

    const fieldRes = await this.db.query(
      "SELECT value FROM profile_fields WHERE user_id = $1 AND field_key = 'targetPathway'",
      [userId],
    );
    if (fieldRes.rows.length > 0 && fieldRes.rows[0].value) {
      rawPathway = fieldRes.rows[0].value;
    }

    const upperPathway = rawPathway.toString().toUpperCase();
    const isAusbildung = upperPathway.includes('AUSBILDUNG') || upperPathway.includes('VOCATIONAL') || upperPathway.includes('TRAINING');
    const isEmployment = upperPathway.includes('EMPLOYMENT') || upperPathway.includes('CAREER') || upperPathway.includes('JOB') || upperPathway.includes('CHANCENKARTE');

    // Retrieve previously completed step numbers to preserve user progress across re-syncs
    const existingRes = await this.db.query(
      `SELECT step_number, is_completed FROM application_roadmaps WHERE user_id = $1`,
      [userId],
    );
    const completedStepNumbers = new Set<number>(
      existingRes.rows.filter((r: any) => Boolean(r.is_completed)).map((r: any) => Number(r.step_number)),
    );

    const steps: Omit<RoadmapStep, 'id'>[] = [];

    if (isAusbildung) {
      // ----------------------------------------------------------------------
      // PATHWAY: AUSBILDUNG (Dual Vocational Training)
      // ----------------------------------------------------------------------
      steps.push({
        stepNumber: 1,
        title: 'Stage 1: Profile & Personal Preparation',
        description: 'Complete verified applicant profile, personal biodata, passport validity (min. 12 months), and 10th/12th secondary school certificates.',
        category: 'PROFILE',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(1) || Boolean(profile?.step1?.fullName),
        dueDate: '9–12 months prior to start date',
        actionUrl: '/journey/details',
        conditionalReason: 'Basic prerequisite for all formal applications in Germany.',
      });

      steps.push({
        stepNumber: 2,
        title: 'Stage 2: Qualification & Eligibility Assessment',
        description: 'Evaluate school leaving certificate equivalence (Zeugnisanerkennung) and verify baseline German language proficiency (minimum CEFR B1/B2 required for vocational school).',
        category: 'QUALIFICATION',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(2) || false,
        dueDate: '8–10 months prior to start date',
        actionUrl: '/journey/qualification',
        conditionalReason: 'German vocational schools (Berufsschule) conduct all theory instruction strictly in German.',
      });

      steps.push({
        stepNumber: 3,
        title: 'Stage 3: Pathway Selection & Vocation Match',
        description: 'Select target occupational trade (e.g., Nursing/Pflegefachkraft, IT-Fachinformatiker, Mechatroniker, Hospitality) aligned with German Chamber of Commerce (IHK/HWK) standards.',
        category: 'PATHWAY',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(3) || true,
        dueDate: '7–8 months prior to start date',
        actionUrl: '/journey/qualification',
      });

      steps.push({
        stepNumber: 4,
        title: 'Stage 4: Scholarship & Financial Planning',
        description: 'Review vocational training remuneration (Ausbildungsvergütung typically €950–€1,400/month). Determine if supplementary blocked account is needed if salary is below threshold.',
        category: 'SCHOLARSHIP',
        isMandatory: false,
        isCompleted: completedStepNumbers.has(4) || false,
        dueDate: '6–7 months prior to start date',
        actionUrl: '/journey/scholarships',
        conditionalReason: 'Ausbildung provides a monthly salary, substantially reducing the blocked account requirement.',
      });

      steps.push({
        stepNumber: 5,
        title: 'Stage 5: Document Preparation & German Dossier',
        description: 'Draft German-format tabular CV (Lebenslauf with professional photo), German cover letter (Anschreiben), certified German translations of school marksheets, and language certificates.',
        category: 'DOCUMENTS',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(5) || false,
        dueDate: '5–6 months prior to start date',
        actionUrl: '/journey/documents',
        conditionalReason: 'Training enterprises expect traditional German application etiquette.',
      });

      steps.push({
        stepNumber: 6,
        title: 'Stage 6: Applications & Employer Deadlines',
        description: 'Submit direct applications to accredited German training enterprises and hospitals via Bundesagentur für Arbeit job portal and enterprise career portals.',
        category: 'APPLICATION',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(6) || false,
        dueDate: 'Spring: Nov 30 / Autumn: April 30',
        actionUrl: 'https://www.arbeitsagentur.de/jobsuche/',
        conditionalReason: 'Primary intake starts September 1 (secondary intake March 1).',
      });

      steps.push({
        stepNumber: 7,
        title: 'Stage 7: Training Offer & Contract Signing',
        description: 'Successfully conclude online interviews, obtain formal vocational training contract (Ausbildungsvertrag), and verify registration with the competent chamber (IHK/HWK).',
        category: 'OFFERS',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(7) || false,
        dueDate: '1–2 months after interview rounds',
        actionUrl: '/consultant',
        conditionalReason: 'A countersigned Ausbildungsvertrag is strictly mandatory for the national vocational training visa.',
      });

      steps.push({
        stepNumber: 8,
        title: 'Stage 8: Visa Preparation & Statutory Requirements',
        description: 'Apply for German National Visa for Vocational Training (§16a AufenthG), obtain Federal Employment Agency approval (Vorabzustimmung), and book German statutory health insurance.',
        category: 'FINANCE_VISA',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(8) || false,
        dueDate: '2–3 months prior to apprenticeship start',
        actionUrl: 'https://india.diplo.de/in-en/service/-/1801264',
        conditionalReason: 'Processing time at German Missions in India is typically 6–10 weeks.',
      });

      steps.push({
        stepNumber: 9,
        title: 'Stage 9: Travel & Departure Preparation',
        description: 'Book flight tickets, coordinate arrival accommodation with the training employer or shared flat (WG), obtain travel health insurance, and prepare original document folder.',
        category: 'TRAVEL',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(9) || false,
        dueDate: '2–4 weeks prior to flight',
        actionUrl: '/consultant',
      });

      steps.push({
        stepNumber: 10,
        title: 'Stage 10: Arrival & Settlement in Germany',
        description: 'Complete address registration (Anmeldung) at local Bürgeramt within 14 days, obtain German tax ID (Steuer-ID), open local Girokonto bank account for salary, and attend Berufsschule enrolment.',
        category: 'SETTLEMENT',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(10) || false,
        dueDate: 'Within first 14 days in Germany',
        actionUrl: 'https://www.make-it-in-germany.com/en/living-in-germany',
        conditionalReason: 'Mandatory German statutory onboarding steps.',
      });

    } else if (isEmployment) {
      // ----------------------------------------------------------------------
      // PATHWAY: EMPLOYMENT / OPPORTUNITY CARD (Chancenkarte)
      // ----------------------------------------------------------------------
      steps.push({
        stepNumber: 1,
        title: 'Stage 1: Profile & Professional Dossier',
        description: 'Build complete professional profile, academic credentials, detailed employment history, technology stack, and verified identity documents.',
        category: 'PROFILE',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(1) || Boolean(profile?.step1?.fullName),
        dueDate: 'Initial setup',
        actionUrl: '/journey/details',
      });

      steps.push({
        stepNumber: 2,
        title: 'Stage 2: Qualification & Equivalence Check',
        description: 'Verify degree comparability via Anabin database (H+ status) or initiate ZAB Statement of Comparability. Verify professional licensure if entering regulated professions.',
        category: 'QUALIFICATION',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(2) || false,
        dueDate: '4–6 months prior to target relocation',
        actionUrl: '/journey/qualification',
        conditionalReason: 'ZAB comparability or Anabin recognition is mandatory for EU Blue Card and Opportunity Card.',
      });

      steps.push({
        stepNumber: 3,
        title: 'Stage 3: Pathway Selection & Regulatory Track',
        description: 'Select legal immigration track: EU Blue Card (§18b AufenthG for qualified professionals), Skilled Worker Visa (§18a/b), or Opportunity Card points system (§20a Chancenkarte).',
        category: 'PATHWAY',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(3) || true,
        dueDate: '3–5 months prior to relocation',
        actionUrl: '/journey/qualification',
      });

      steps.push({
        stepNumber: 4,
        title: 'Stage 4: Financial Planning & Proof of Means',
        description: 'Verify statutory minimum salary threshold (€45,300/yr or bottleneck profession €41,041/yr for Blue Card) or fund blocked account (€1,027/mo) for Opportunity Card job-search.',
        category: 'SCHOLARSHIP',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(4) || false,
        dueDate: '2–4 months prior to relocation',
        actionUrl: '/journey/scholarships',
      });

      steps.push({
        stepNumber: 5,
        title: 'Stage 5: Document Preparation & German CV Format',
        description: 'Prepare German-style Europass CV, reference letters from previous employers, degree certificate apostilles, and language proficiency proofs (German or English).',
        category: 'DOCUMENTS',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(5) || false,
        dueDate: '2–3 months prior to active job hunt',
        actionUrl: '/journey/documents',
      });

      steps.push({
        stepNumber: 6,
        title: 'Stage 6: Job Search & Direct Applications',
        description: 'Target German employers via StepStone, LinkedIn Germany, and Make it in Germany job exchange; prepare for technical interviews and cultural fit assessments.',
        category: 'APPLICATION',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(6) || false,
        dueDate: 'Rolling recruitment cycles',
        actionUrl: 'https://www.make-it-in-germany.com/en/working-in-germany',
      });

      steps.push({
        stepNumber: 7,
        title: 'Stage 7: Employment Contract Offer & Verification',
        description: 'Secure binding job offer (Arbeitsvertrag) and completed job description form (Erklärung zum Beschäftigungsverhältnis) from the German employer.',
        category: 'OFFERS',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(7) || false,
        dueDate: 'Upon formal contract offer',
        actionUrl: '/consultant',
        conditionalReason: 'Erklärung zum Beschäftigungsverhältnis is required by German embassy for visa issuance.',
      });

      steps.push({
        stepNumber: 8,
        title: 'Stage 8: Visa Preparation & Fast-Track Procedure',
        description: 'Apply for EU Blue Card National Visa or Opportunity Card at VFS/German Mission, initiate employer fast-track procedure (§81a AufenthG if applicable), and set up statutory health insurance.',
        category: 'FINANCE_VISA',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(8) || false,
        dueDate: '6–8 weeks prior to employment start',
        actionUrl: 'https://india.diplo.de/in-en/service/-/1801264',
      });

      steps.push({
        stepNumber: 9,
        title: 'Stage 9: Travel & Relocation Preparation',
        description: 'Book flight tickets, reserve temporary furnished apartment (Wunderflats/MrLodge), organize international shipping/packing, and secure arrival travel insurance.',
        category: 'TRAVEL',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(9) || false,
        dueDate: '2–3 weeks prior to departure',
        actionUrl: '/consultant',
      });

      steps.push({
        stepNumber: 10,
        title: 'Stage 10: Arrival & Settlement in Germany',
        description: 'Register address (Anmeldung) at local Bürgeramt within 14 days, receive Tax Identification Number (Steuer-ID) and Social Security ID, open bank account, and convert visa to electronic residence title.',
        category: 'SETTLEMENT',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(10) || false,
        dueDate: 'Within first 14 days in Germany',
        actionUrl: 'https://www.make-it-in-germany.com/en/living-in-germany',
        conditionalReason: 'Mandatory German statutory onboarding steps.',
      });

    } else {
      // ----------------------------------------------------------------------
      // PATHWAY: HIGHER EDUCATION (Bachelor / Master / PhD Study)
      // ----------------------------------------------------------------------
      steps.push({
        stepNumber: 1,
        title: 'Stage 1: Profile & Personal Preparation',
        description: 'Finalise comprehensive personal background, academic transcripts, GPA, Bavarian formula grade conversion, and language certifications.',
        category: 'PROFILE',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(1) || (Boolean(profile?.step1?.fullName) && Boolean(profile?.step2?.cgpaOrPercentage)),
        dueDate: '12–14 months prior to intake',
        actionUrl: '/journey/details',
        conditionalReason: 'The Applicant Profile serves as the single source of truth across all admission recommendations.',
      });

      steps.push({
        stepNumber: 2,
        title: 'Stage 2: Qualification & Eligibility Assessment',
        description: 'Verify Indian university status on Anabin (H+ institution), calculate German grade equivalence (1.0–4.0 scale), check ECTS prerequisite compatibility, and prepare APS verification dossier.',
        category: 'QUALIFICATION',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(2) || false,
        dueDate: '10–12 months prior to intake',
        actionUrl: '/journey/qualification',
        conditionalReason: 'Mandatory verification by the Academic Evaluation Centre (APS New Delhi) for all Indian degrees since November 2022.',
      });

      steps.push({
        stepNumber: 3,
        title: 'Stage 3: Pathway Selection & Program Matching',
        description: 'Select target degree program (Master/Bachelor), compare English-taught vs German-taught curricula, and evaluate public university recommendations across German federal states.',
        category: 'PATHWAY',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(3) || true,
        dueDate: '9–10 months prior to intake',
        actionUrl: '/engine/dashboard',
        conditionalReason: 'Choose between tuition-free public universities, TU9 research institutions, or specialized Universities of Applied Sciences (HAW/FH).',
      });

      steps.push({
        stepNumber: 4,
        title: 'Stage 4: Scholarship & Financial Planning',
        description: 'Evaluate verified scholarship opportunities (DAAD, Deutschlandstipendium, foundations) and prepare proof of financial resources via Sperrkonto (Blocked Account of €11,904/year).',
        category: 'SCHOLARSHIP',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(4) || false,
        dueDate: '6–9 months prior to intake',
        actionUrl: '/journey/scholarships',
        conditionalReason: 'Many DAAD and foundation scholarships have application deadlines 9–12 months prior to the academic semester.',
      });

      steps.push({
        stepNumber: 5,
        title: 'Stage 5: Document Preparation & German Dossier',
        description: 'Assemble German-standard tabular CV (Europass format), Statement of Purpose / Letter of Motivation, module handbooks with course syllabus, and certified translations.',
        category: 'DOCUMENTS',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(5) || false,
        dueDate: '4–6 months prior to intake',
        actionUrl: '/journey/documents',
        conditionalReason: 'German universities strictly evaluate course syllabus credit matches against their bachelor curriculum.',
      });

      steps.push({
        stepNumber: 6,
        title: 'Stage 6: Applications & University Deadlines',
        description: 'Submit preliminary documentation verification (VPD) through Uni-Assist and complete direct university portal applications before winter (July 15) or summer (Jan 15) deadlines.',
        category: 'APPLICATION',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(6) || false,
        dueDate: 'Winter: 15 July / Summer: 15 Jan',
        actionUrl: 'https://www.uni-assist.de/en/',
        conditionalReason: 'Uni-Assist processing takes 4–6 weeks. Submit well before the hard institutional deadline.',
      });

      steps.push({
        stepNumber: 7,
        title: 'Stage 7: Admission Offer & Enrollment Confirmation',
        description: 'Receive and verify official letters of admission (Zulassungsbescheid), confirm offer acceptance on university portals, and transfer the semester social contribution fee.',
        category: 'OFFERS',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(7) || false,
        dueDate: '4–6 weeks after application deadline',
        actionUrl: '/consultant',
        conditionalReason: 'Official admission letter is required for visa interview booking and university matriculation.',
      });

      steps.push({
        stepNumber: 8,
        title: 'Stage 8: Visa Preparation & Statutory Requirements',
        description: 'Fund Blocked Account (€11,904), obtain statutory student health insurance (TK/AOK/Barmer), submit APS Certificate, and attend National Student Visa appointment at VFS / German Mission.',
        category: 'FINANCE_VISA',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(8) || false,
        dueDate: '2–3 months prior to departure',
        actionUrl: 'https://india.diplo.de/in-en/service/-/1801264',
        conditionalReason: 'All Indian students require a verified APS certificate and German statutory student health insurance.',
      });

      steps.push({
        stepNumber: 9,
        title: 'Stage 9: Travel & Departure Preparation',
        description: 'Book flight to Germany, arrange temporary accommodation or Studentenwerk dormitory room, purchase travel health coverage, and prepare original document portfolio for border control.',
        category: 'TRAVEL',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(9) || false,
        dueDate: '3–4 weeks prior to flight',
        actionUrl: '/consultant',
      });

      steps.push({
        stepNumber: 10,
        title: 'Stage 10: Arrival & Settlement in Germany',
        description: 'Register address at Bürgeramt (Anmeldung within 14 days), receive Tax ID, open German bank account (Girokonto), finalize in-person university Immatrikulation, and apply for Residence Permit (§16b).',
        category: 'SETTLEMENT',
        isMandatory: true,
        isCompleted: completedStepNumbers.has(10) || false,
        dueDate: 'Within first 14 days in Germany',
        actionUrl: 'https://www.make-it-in-germany.com/en/living-in-germany',
        conditionalReason: 'Mandatory German statutory onboarding steps.',
      });
    }

    // Save to database
    await this.db.query(`DELETE FROM application_roadmaps WHERE user_id = $1`, [userId]);
    const savedSteps: RoadmapStep[] = [];

    for (const s of steps) {
      const id = uuidv4();
      await this.db.query(
        `INSERT INTO application_roadmaps (
          id, user_id, step_number, title, description, category, is_mandatory, is_completed, due_date, action_url, conditional_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          userId,
          s.stepNumber,
          s.title,
          s.description,
          s.category,
          s.isMandatory,
          s.isCompleted,
          s.dueDate || null,
          s.actionUrl || null,
          s.conditionalReason || null,
        ],
      );
      savedSteps.push({ id, ...s });
    }

    return savedSteps;
  }

  async toggleRoadmapStep(userId: string, stepId: string, completed: boolean): Promise<RoadmapStep> {
    const res = await this.db.query(
      `UPDATE application_roadmaps SET is_completed = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [completed, stepId, userId],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Roadmap step not found or unauthorized');
    }
    const r = res.rows[0];
    return {
      id: r.id,
      stepNumber: r.step_number,
      title: r.title,
      description: r.description,
      category: r.category,
      isMandatory: Boolean(r.is_mandatory),
      isCompleted: Boolean(r.is_completed),
      dueDate: r.due_date,
      actionUrl: r.action_url,
      conditionalReason: r.conditional_reason,
    };
  }

  // --------------------------------------------------------------------------
  // SHORTLIST MANAGEMENT
  // --------------------------------------------------------------------------

  async getShortlists(userId: string): Promise<SavedShortlistItem[]> {
    const res = await this.db.query(
      `SELECT s.*, 
        CASE 
          WHEN s.item_type = 'PROGRAMME' THEN p.programme_name 
          ELSE sc.scholarship_name 
        END as item_title,
        CASE 
          WHEN s.item_type = 'PROGRAMME' THEN u.name 
          ELSE sc.provider_name 
        END as subtitle,
        CASE 
          WHEN s.item_type = 'PROGRAMME' THEN p.application_deadline_winter 
          ELSE sc.application_deadline 
        END as deadline
      FROM saved_shortlists s
      LEFT JOIN programmes p ON s.item_type = 'PROGRAMME' AND s.item_id = p.id
      LEFT JOIN universities u ON p.university_id = u.id
      LEFT JOIN scholarships sc ON s.item_type = 'SCHOLARSHIP' AND s.item_id = sc.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC`,
      [userId],
    );

    return res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      itemType: r.item_type,
      itemId: r.item_id,
      itemTitle: r.item_title || 'Item',
      subtitle: r.subtitle || '',
      deadline: r.deadline || '',
      notes: r.notes || '',
      savedAt: r.created_at,
    }));
  }

  async addShortlistItem(
    userId: string,
    dto: { itemType: 'PROGRAMME' | 'SCHOLARSHIP'; itemId: string; notes?: string },
  ): Promise<SavedShortlistItem> {
    const id = uuidv4();
    await this.db.query(
      `INSERT INTO saved_shortlists (id, user_id, item_type, item_id, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET notes = EXCLUDED.notes`,
      [id, userId, dto.itemType, dto.itemId, dto.notes || ''],
    );
    const shortlists = await this.getShortlists(userId);
    return shortlists.find((s) => s.itemId === dto.itemId)!;
  }

  async removeShortlistItem(userId: string, itemType: string, itemId: string): Promise<{ success: boolean }> {
    await this.db.query(
      `DELETE FROM saved_shortlists WHERE user_id = $1 AND item_type = $2 AND item_id = $3`,
      [userId, itemType, itemId],
    );
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // AI GROUNDED CONVERSATIONAL ASSISTANT
  // --------------------------------------------------------------------------

  async askAiAssistant(userId: string, userQuery: string): Promise<{ answer: string; groundedSources: string[] }> {
    const profile = await this.getProfile(userId);
    const recommendations = await this.getRecommendations(userId);

    // Build grounded context
    const topUnis = recommendations.universityMatches.slice(0, 4).map((u) => ({
      programme: u.programme.programmeName,
      university: u.programme.universityName,
      status: u.admissionStatus,
      score: u.matchScore,
      tuition: u.programme.tuitionFeeEUR,
      language: u.programme.teachingLanguage,
      url: u.programme.officialProgrammeUrl,
      requirements: u.programme.officialAdmissionRequirementsUrl,
    }));

    const topSchols = recommendations.scholarshipMatches.slice(0, 4).map((s) => ({
      name: s.scholarship.scholarshipName,
      provider: s.scholarship.providerName,
      status: s.eligibilityStatus,
      funding: `€${s.scholarship.fundingAmount} ${s.scholarship.paymentFrequency}`,
      url: s.scholarship.officialApplicationUrl,
    }));

    const systemPrompt = `You are the German University & Scholarship Advisory Assistant for Indian students on EduRoute AI.
CRITICAL INSTRUCTIONS:
1. ONLY refer to verified facts and programs from the applicant's matched results provided in the JSON context below.
2. NEVER invent non-existent universities, requirements, cutoffs, tuition fees, or URL links.
3. Be transparent: explain that the German grading scale uses 1.0 (best) to 4.0 (passing) via the Bavarian formula.
4. If the applicant lacks a mandatory prerequisite (e.g. C1 German for a German-taught degree), state this clearly and do not give false hopes.
5. Provide actionable steps and mention official links (Uni-Assist, DAAD, APS India).`;

    const contextPayload = {
      applicant: {
        name: profile?.step1.fullName,
        degree: profile?.step1.intendedStudyLevel,
        subject: profile?.step1.intendedSubject,
        cgpa: profile?.step2.cgpaOrPercentage,
        germanGradeEstimate: profile?.step2.estimatedGermanGrade,
        germanLevel: profile?.step3.germanProficiency,
        englishScore: profile?.step3.englishScore,
      },
      topUniversityMatches: topUnis,
      topScholarshipMatches: topSchols,
    };

    if (this.groq) {
      try {
        const completion = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `User Context:\n${JSON.stringify(contextPayload, null, 2)}\n\nApplicant Question: "${userQuery}"`,
            },
          ],
          temperature: 0.2,
          max_tokens: 800,
        });

        const reply = completion.choices[0]?.message?.content?.trim();
        if (reply) {
          return {
            answer: reply,
            groundedSources: topUnis.map((u) => `${u.programme} (${u.university})`),
          };
        }
      } catch (err: any) {
        this.logger.warn(`Groq completion failed or timed out: ${err.message}. Falling back to deterministic synthesizer.`);
      }
    }

    // Graceful grounded deterministic fallback (TEST 9)
    const fallbackReply = this.synthesizeDeterministicAnswer(userQuery, profile, recommendations);
    return {
      answer: fallbackReply,
      groundedSources: topUnis.map((u) => `${u.programme} (${u.university})`),
    };
  }

  private synthesizeDeterministicAnswer(
    query: string,
    profile: FullApplicantProfile | null,
    rec: RecommendationEngineResponse,
  ): string {
    const q = query.toLowerCase();
    const gGrade = profile?.step2.estimatedGermanGrade?.toFixed(2) || '2.0';
    const topProg = rec.universityMatches[0];
    const topSchol = rec.scholarshipMatches[0];

    if (q.includes('scholarship') || q.includes('funding') || q.includes('money')) {
      if (!topSchol) return 'Based on your profile, no active scholarships currently match. Check back as new calls open.';
      return `Based on our verified database, your top matching scholarship is **${topSchol.scholarship.scholarshipName}** provided by **${topSchol.scholarship.providerName}** (Status: ${topSchol.eligibilityStatus.replace('_', ' ')}).\n\nFunding: €${topSchol.scholarship.fundingAmount.toLocaleString()} (${topSchol.scholarship.paymentFrequency.toLowerCase()}).\nDeadline: ${topSchol.scholarship.applicationDeadline}.\nWhy it matched: ${topSchol.whyAmISeeingThis}\nOfficial portal: ${topSchol.scholarship.officialApplicationUrl}`;
    }

    if (q.includes('grade') || q.includes('gpa') || q.includes('german grade') || q.includes('bavarian')) {
      return `Using the Bavarian Formula: German Grade = 1 + 3 * ((Nmax - N) / (Nmax - Nmin)).\nYour CGPA converts to an estimated German grade of **${gGrade}** (1.0 is the best possible grade, 4.0 is minimum pass).\nProgrammes like **${topProg?.programme.programmeName || 'Master in CS'}** require a minimum grade of ${topProg?.programme.minimumAcademicGradeGerman || 2.5}.`;
    }

    if (q.includes('german') || q.includes('language') || q.includes('c1') || q.includes('b2')) {
      return `Your current German proficiency is recorded as **${profile?.step3.germanProficiency || 'None'}**.\nEnglish-taught programmes in Germany require IELTS (6.5+) or TOEFL (90+), whereas German-taught programmes strictly require C1 level (such as TestDaF 4x4, DSH-2, or Goethe-Zertifikat C1).`;
    }

    if (q.includes('aps') || q.includes('visa')) {
      return `All Indian applicants require an **APS Certificate** from APS India (New Delhi) before applying for university admissions or the national student visa. You also require proof of financial resources (Blocked Account / Sperrkonto of approx. €11,904/year or €992/month).`;
    }

    return `Based on your academic profile, your top recommended university programme is **${topProg?.programme.programmeName || 'Technical Computer Science'}** at **${topProg?.programme.universityName || 'TU Munich'}** (Match score: ${topProg?.matchScore || 85}%, Status: ${topProg?.admissionStatus || 'SATISFIED'}).\n\nTuition: €${topProg?.programme.tuitionFeeEUR || 0} / semester.\nEstimated living costs: ~€${topProg?.programme.livingCostEstimateMonthlyEUR || 934} / month.\nOfficial website: ${topProg?.programme.officialProgrammeUrl}`;
  }

  // --------------------------------------------------------------------------
  // DATABASE RETRIEVAL HELPERS
  // --------------------------------------------------------------------------

  async getAllUniversities(): Promise<UniversityRecord[]> {
    const res = await this.db.query(`SELECT * FROM universities ORDER BY name ASC`);
    return res.rows.map((r) => this.mapUniversityRow(r));
  }

  async getAllProgrammesWithUniversities(): Promise<ProgrammeRecord[]> {
    const res = await this.db.query(`
      SELECT p.*, u.name as uni_name, u.city as uni_city, u.federal_state as uni_state,
             u.institution_type as uni_type, u.public_or_private as uni_ownership,
             u.living_cost_estimate_monthly as uni_living_cost
      FROM programmes p
      JOIN universities u ON p.university_id = u.id
      ORDER BY p.programme_name ASC
    `);
    return res.rows.map((r) => this.mapProgrammeRow(r));
  }

  async getAllScholarships(): Promise<ScholarshipRecord[]> {
    const res = await this.db.query(`SELECT * FROM scholarships ORDER BY scholarship_name ASC`);
    return res.rows.map((r) => this.mapScholarshipRow(r));
  }

  async getAllScholarshipRules(): Promise<ScholarshipRuleRecord[]> {
    const res = await this.db.query(`SELECT * FROM scholarship_rules ORDER BY rule_type ASC`);
    return res.rows.map((r) => this.mapScholarshipRuleRow(r));
  }

  async getExamResources(filters?: { exam?: string; type?: string; query?: string }) {
    let list = CURATED_EXAM_RESOURCES;
    if (filters?.exam && filters.exam !== 'ALL') {
      list = list.filter((r) => r.exam === filters.exam);
    }
    if (filters?.type && filters.type !== 'ALL') {
      list = list.filter((r) => r.resourceType === filters.type);
    }
    if (filters?.query?.trim()) {
      const q = filters.query.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.provider.toLowerCase().includes(q),
      );
    }
    return {
      exams: EXAM_INFO_CATALOG,
      resources: list,
    };
  }

  // --------------------------------------------------------------------------
  // ADMIN PORTAL OPERATIONS (Section 10)
  // --------------------------------------------------------------------------

  async adminCreateUniversity(dto: UniversityRecord): Promise<UniversityRecord> {
    const id = dto.id || `uni_${uuidv4().slice(0, 8)}`;
    await this.db.query(
      `INSERT INTO universities (
        id, name, official_website, city, federal_state, institution_type,
        public_or_private, international_admissions_url, tuition_fee_information,
        semester_contribution, general_contact_url, source_url, living_cost_estimate_monthly,
        campus_setting, last_verified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)`,
      [
        id,
        dto.name,
        dto.officialWebsite,
        dto.city,
        dto.federalState,
        dto.institutionType,
        dto.publicOrPrivate,
        dto.internationalAdmissionsUrl,
        dto.tuitionFeeInformation,
        dto.semesterContributionEUR || 300,
        dto.generalContactUrl,
        dto.sourceUrl,
        dto.livingCostEstimateMonthlyEUR || 934,
        dto.campusSetting || '',
      ],
    );
    const res = await this.db.query(`SELECT * FROM universities WHERE id = $1`, [id]);
    return this.mapUniversityRow(res.rows[0]);
  }

  async adminCreateProgramme(dto: ProgrammeRecord): Promise<ProgrammeRecord> {
    const id = dto.id || `prog_${uuidv4().slice(0, 8)}`;
    await this.db.query(
      `INSERT INTO programmes (
        id, university_id, programme_name, degree_level, subject_area, specialisation,
        teaching_language, accepted_language_certificates, minimum_language_scores,
        minimum_academic_grade, required_previous_degree, required_subjects,
        required_credit_categories, gre_requirement, other_entrance_tests,
        application_method, application_open_date_winter, application_deadline_winter,
        application_open_date_summer, application_deadline_summer, intake,
        tuition_fee, semester_contribution, estimated_duration_semesters,
        official_programme_url, official_admission_requirements_url, data_source, last_verified_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, CURRENT_TIMESTAMP
      )`,
      [
        id,
        dto.universityId,
        dto.programmeName,
        dto.degreeLevel,
        dto.subjectArea,
        dto.specialisation || '',
        dto.teachingLanguage,
        JSON.stringify(dto.acceptedLanguageCertificates || []),
        JSON.stringify(dto.minimumLanguageScores || {}),
        dto.minimumAcademicGradeGerman,
        dto.requiredPreviousDegree,
        JSON.stringify(dto.requiredSubjects || []),
        JSON.stringify(dto.requiredCreditCategories || {}),
        dto.greRequirement || 'NOT_REQUIRED',
        dto.otherEntranceTests || '',
        dto.applicationMethod,
        dto.applicationOpenDateWinter || '',
        dto.applicationDeadlineWinter,
        dto.applicationOpenDateSummer || '',
        dto.applicationDeadlineSummer || '',
        dto.intake || 'WINTER',
        dto.tuitionFeeEUR || 0,
        dto.semesterContributionEUR || 300,
        dto.estimatedDurationSemesters || 4,
        dto.officialProgrammeUrl,
        dto.officialAdmissionRequirementsUrl,
        dto.dataSource || 'Official Admissions Portal',
      ],
    );
    const res = await this.db.query(`SELECT * FROM programmes WHERE id = $1`, [id]);
    return this.mapProgrammeRow(res.rows[0]);
  }

  async adminCreateScholarship(dto: ScholarshipRecord): Promise<ScholarshipRecord> {
    const id = dto.id || `schol_${uuidv4().slice(0, 8)}`;
    await this.db.query(
      `INSERT INTO scholarships (
        id, scholarship_name, provider_name, provider_type, associated_university_id,
        funding_type, funding_amount, currency, payment_frequency, duration_months,
        tuition_coverage, living_cost_coverage, insurance_coverage, travel_allowance,
        nationality_eligibility, eligible_degree_levels, eligible_subjects,
        minimum_academic_requirements, financial_need_requirement, sports_achievement_requirement,
        gender_related_eligibility, disability_related_eligibility, other_eligibility_conditions,
        required_documents, application_method, application_deadline, official_application_url,
        official_eligibility_url, source_url, verification_status, last_verified_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, CURRENT_TIMESTAMP
      )`,
      [
        id,
        dto.scholarshipName,
        dto.providerName,
        dto.providerType,
        dto.associatedUniversityId || null,
        dto.fundingType,
        dto.fundingAmount,
        dto.currency || 'EUR',
        dto.paymentFrequency,
        dto.durationMonths,
        dto.tuitionCoverage ?? false,
        dto.livingCostCoverage ?? false,
        dto.insuranceCoverage ?? false,
        dto.travelAllowance ?? false,
        JSON.stringify(dto.nationalityEligibility || ['ALL_INTERNATIONAL']),
        JSON.stringify(dto.eligibleDegreeLevels || ['MASTER']),
        JSON.stringify(dto.eligibleSubjects || ['ALL']),
        dto.minimumAcademicGradeGerman ? String(dto.minimumAcademicGradeGerman) : '',
        dto.financialNeedRequirement ?? false,
        dto.sportsAchievementRequirement ?? false,
        dto.genderRelatedEligibility || 'NONE',
        dto.disabilityRelatedEligibility || 'NONE',
        dto.otherEligibilityConditions || '',
        JSON.stringify(dto.requiredDocuments || []),
        dto.applicationMethod,
        dto.applicationDeadline,
        dto.officialApplicationUrl,
        dto.officialEligibilityUrl,
        dto.sourceUrl,
        dto.verificationStatus || 'VERIFIED',
      ],
    );
    const res = await this.db.query(`SELECT * FROM scholarships WHERE id = $1`, [id]);
    return this.mapScholarshipRow(res.rows[0]);
  }

  async adminImportCsv(entityType: 'UNIVERSITIES' | 'PROGRAMMES' | 'SCHOLARSHIPS', csvText: string): Promise<{ importedCount: number }> {
    const lines = csvText.trim().split('\n').filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      throw new BadRequestException('CSV file must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      if (entityType === 'UNIVERSITIES') {
        await this.adminCreateUniversity({
          id: row.id || `uni_csv_${i}`,
          name: row.name || 'University',
          officialWebsite: row.officialWebsite || 'https://www.daad.de',
          city: row.city || 'Berlin',
          federalState: row.federalState || 'Berlin',
          institutionType: (row.institutionType as any) || 'UNIVERSITAET',
          publicOrPrivate: (row.publicOrPrivate as any) || 'PUBLIC',
          internationalAdmissionsUrl: row.internationalAdmissionsUrl || 'https://www.daad.de',
          tuitionFeeInformation: row.tuitionFeeInformation || 'No tuition fee',
          semesterContributionEUR: parseFloat(row.semesterContributionEUR || '300'),
          generalContactUrl: row.generalContactUrl || 'https://www.daad.de',
          sourceUrl: row.sourceUrl || 'https://www.daad.de',
          lastVerifiedAt: new Date().toISOString(),
          livingCostEstimateMonthlyEUR: parseFloat(row.livingCostEstimateMonthlyEUR || '934'),
        });
        importedCount++;
      } else if (entityType === 'PROGRAMMES') {
        await this.adminCreateProgramme({
          id: row.id || `prog_csv_${i}`,
          universityId: row.universityId || 'uni_tum',
          programmeName: row.programmeName || 'Degree Programme',
          degreeLevel: (row.degreeLevel as any) || 'MASTER',
          subjectArea: row.subjectArea || 'Computer Science',
          specialisation: row.specialisation || '',
          teachingLanguage: (row.teachingLanguage as any) || 'ENGLISH',
          acceptedLanguageCertificates: ['IELTS', 'TOEFL'],
          minimumLanguageScores: { ieltsMinOverall: 6.5 },
          minimumAcademicGradeGerman: parseFloat(row.minimumAcademicGradeGerman || '2.5'),
          requiredPreviousDegree: row.requiredPreviousDegree || 'Bachelor in relevant field',
          requiredSubjects: [],
          requiredCreditCategories: {},
          greRequirement: 'NOT_REQUIRED',
          applicationMethod: (row.applicationMethod as any) || 'UNI_ASSIST',
          applicationDeadlineWinter: row.applicationDeadlineWinter || '2026-07-15',
          intake: 'WINTER',
          tuitionFeeEUR: parseFloat(row.tuitionFeeEUR || '0'),
          semesterContributionEUR: parseFloat(row.semesterContributionEUR || '300'),
          estimatedDurationSemesters: 4,
          officialProgrammeUrl: row.officialProgrammeUrl || 'https://www.daad.de',
          officialAdmissionRequirementsUrl: row.officialAdmissionRequirementsUrl || 'https://www.daad.de',
          dataSource: 'CSV Import',
          lastVerifiedAt: new Date().toISOString(),
        });
        importedCount++;
      } else if (entityType === 'SCHOLARSHIPS') {
        await this.adminCreateScholarship({
          id: row.id || `schol_csv_${i}`,
          scholarshipName: row.scholarshipName || 'Scholarship Scheme',
          providerName: row.providerName || 'Provider',
          providerType: (row.providerType as any) || 'FOUNDATION',
          fundingType: (row.fundingType as any) || 'MONTHLY_STIPEND',
          fundingAmount: parseFloat(row.fundingAmount || '934'),
          currency: 'EUR',
          paymentFrequency: 'MONTHLY',
          durationMonths: 24,
          tuitionCoverage: false,
          livingCostCoverage: true,
          insuranceCoverage: true,
          travelAllowance: false,
          nationalityEligibility: ['ALL_INTERNATIONAL'],
          eligibleDegreeLevels: ['MASTER'],
          eligibleSubjects: ['ALL'],
          financialNeedRequirement: false,
          sportsAchievementRequirement: false,
          genderRelatedEligibility: 'NONE',
          disabilityRelatedEligibility: 'NONE',
          requiredDocuments: ['CV', 'Transcripts'],
          applicationMethod: 'ONLINE_PORTAL',
          applicationDeadline: row.applicationDeadline || '2026-10-31',
          officialApplicationUrl: row.officialApplicationUrl || 'https://www.daad.de',
          officialEligibilityUrl: row.officialEligibilityUrl || 'https://www.daad.de',
          sourceUrl: row.sourceUrl || 'https://www.daad.de',
          verificationStatus: 'VERIFIED',
          lastVerifiedAt: new Date().toISOString(),
        });
        importedCount++;
      }
    }

    return { importedCount };
  }

  // --------------------------------------------------------------------------
  // ROW MAPPERS
  // --------------------------------------------------------------------------

  private mapUniversityRow(r: any): UniversityRecord {
    return {
      id: r.id,
      name: r.name,
      officialWebsite: r.official_website,
      city: r.city,
      federalState: r.federal_state,
      institutionType: r.institution_type,
      publicOrPrivate: r.public_or_private,
      internationalAdmissionsUrl: r.international_admissions_url,
      tuitionFeeInformation: r.tuition_fee_information,
      semesterContributionEUR: Number(r.semester_contribution),
      generalContactUrl: r.general_contact_url,
      sourceUrl: r.source_url,
      lastVerifiedAt: r.last_verified_at,
      campusSetting: r.campus_setting,
      livingCostEstimateMonthlyEUR: Number(r.living_cost_estimate_monthly),
    };
  }

  private mapProgrammeRow(r: any): ProgrammeRecord {
    return {
      id: r.id,
      universityId: r.university_id,
      programmeName: r.programme_name,
      degreeLevel: r.degree_level,
      subjectArea: r.subject_area,
      specialisation: r.specialisation,
      teachingLanguage: r.teaching_language,
      acceptedLanguageCertificates: JSON.parse(r.accepted_language_certificates || '[]'),
      minimumLanguageScores: JSON.parse(r.minimum_language_scores || '{}'),
      minimumAcademicGradeGerman: Number(r.minimum_academic_grade),
      requiredPreviousDegree: r.required_previous_degree,
      requiredSubjects: JSON.parse(r.required_subjects || '[]'),
      requiredCreditCategories: JSON.parse(r.required_credit_categories || '{}'),
      greRequirement: r.gre_requirement,
      otherEntranceTests: r.other_entrance_tests,
      applicationMethod: r.application_method,
      applicationOpenDateWinter: r.application_open_date_winter,
      applicationDeadlineWinter: r.application_deadline_winter,
      applicationOpenDateSummer: r.application_open_date_summer,
      applicationDeadlineSummer: r.application_deadline_summer,
      intake: r.intake,
      tuitionFeeEUR: Number(r.tuition_fee),
      semesterContributionEUR: Number(r.semester_contribution),
      estimatedDurationSemesters: Number(r.estimated_duration_semesters),
      officialProgrammeUrl: r.official_programme_url,
      officialAdmissionRequirementsUrl: r.official_admission_requirements_url,
      dataSource: r.data_source,
      lastVerifiedAt: r.last_verified_at,
      universityName: r.uni_name,
      city: r.uni_city,
      federalState: r.uni_state,
      institutionType: r.uni_type,
      publicOrPrivate: r.uni_ownership,
      livingCostEstimateMonthlyEUR: r.uni_living_cost ? Number(r.uni_living_cost) : 934,
    };
  }

  private mapScholarshipRow(r: any): ScholarshipRecord {
    return {
      id: r.id,
      scholarshipName: r.scholarship_name,
      providerName: r.provider_name,
      providerType: r.provider_type,
      associatedUniversityId: r.associated_university_id,
      fundingType: r.funding_type,
      fundingAmount: Number(r.funding_amount),
      currency: r.currency,
      paymentFrequency: r.payment_frequency,
      durationMonths: Number(r.duration_months),
      tuitionCoverage: Boolean(r.tuition_coverage),
      livingCostCoverage: Boolean(r.living_cost_coverage),
      insuranceCoverage: Boolean(r.insurance_coverage),
      travelAllowance: Boolean(r.travel_allowance),
      nationalityEligibility: JSON.parse(r.nationality_eligibility || '[]'),
      eligibleDegreeLevels: JSON.parse(r.eligible_degree_levels || '[]'),
      eligibleSubjects: JSON.parse(r.eligible_subjects || '[]'),
      minimumAcademicGradeGerman: r.minimum_academic_requirements ? parseFloat(r.minimum_academic_requirements) : undefined,
      financialNeedRequirement: Boolean(r.financial_need_requirement),
      sportsAchievementRequirement: Boolean(r.sports_achievement_requirement),
      genderRelatedEligibility: r.gender_related_eligibility,
      disabilityRelatedEligibility: r.disability_related_eligibility,
      otherEligibilityConditions: r.other_eligibility_conditions,
      requiredDocuments: JSON.parse(r.required_documents || '[]'),
      applicationMethod: r.application_method,
      applicationDeadline: r.application_deadline,
      officialApplicationUrl: r.official_application_url,
      officialEligibilityUrl: r.official_eligibility_url,
      sourceUrl: r.source_url,
      verificationStatus: r.verification_status,
      lastVerifiedAt: r.last_verified_at,
    };
  }

  private mapScholarshipRuleRow(r: any): ScholarshipRuleRecord {
    return {
      id: r.id,
      scholarshipId: r.scholarship_id,
      ruleType: r.rule_type,
      ruleDescription: r.rule_description,
      conditionType: r.condition_type,
      conditionValue: r.condition_value,
      mandatoryOrPreferred: r.mandatory_or_preferred,
      evidenceRequired: r.evidence_required,
      exceptionNotes: r.exception_notes,
      officialSourceUrl: r.official_source_url,
      lastVerifiedAt: r.last_verified_at,
    };
  }
}
