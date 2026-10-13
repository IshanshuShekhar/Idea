import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AgentEventsService } from '../agent-events/agent-events.service';
import { ProfileService } from '../profile/profile.service';
import {
  Pathway,
  QualificationStatus,
  CEFRLevel,
  QualificationEvaluation,
  MissingRequirement,
  WhatIfCriteria,
  WhatIfResult,
  GermanReadinessTrack,
  GermanLearningPathData,
  GermanReadinessCalculation,
  QualificationDiff,
  SimulationResultPayload,
  ComprehensiveApplicantProfile,
  QualificationFactorScore,
  QualificationScoringMethodology,
  NextStepActionItem,
  QualificationStatusTier,
} from '@educaro/shared';
import * as fs from 'fs';
import * as path from 'path';

// Configurable weeks-per-level constant for deterministic calculation
export const WEEKS_PER_LEVEL = 8; // 8 weeks per CEFR sublevel at 10-12 hrs/week study pace

@Injectable()
export class QualificationService {
  private readonly logger = new Logger(QualificationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly eventsService: AgentEventsService,
    private readonly profileService: ProfileService,
  ) {}

  async evaluateQualification(
    userId: string,
    germanLevelOverride?: CEFRLevel,
    skipSimulations = false,
  ): Promise<QualificationEvaluation> {
    const startTime = Date.now();

    // 1. Fetch comprehensive profile (auto-migrated from profile_fields/documents if not yet in comprehensive_profiles)
    const comprehensiveProfile = await this.profileService.getComprehensiveProfile(userId);

    // 2. Fetch raw profile fields for legacy/fallback lookups
    const fieldsRes = await this.db.query(
      'SELECT field_key, value FROM profile_fields WHERE user_id = $1',
      [userId]
    );
    const fieldMap: Record<string, string> = {};
    for (const row of fieldsRes.rows) {
      fieldMap[row.field_key] = row.value;
    }

    // 3. Check unresolved inconsistencies from DB (blocking in real evaluation)
    const incRes = await this.db.query(
      'SELECT id FROM inconsistencies WHERE user_id = $1 AND is_resolved = FALSE',
      [userId]
    );
    const hasUnresolvedInconsistencies = incRes.rows.length > 0;

    // 4. Check actual uploaded documents from documents table
    const docsRes = await this.db.query(
      'SELECT document_type, status FROM documents WHERE user_id = $1',
      [userId]
    );
    const uploadedTypes = new Set<string>(docsRes.rows.map((r: any) => r.document_type));

    // 5. Determine target pathway
    const rawPathway = (
      comprehensiveProfile.goals?.primaryPathway ||
      fieldMap['targetPathway'] ||
      'STUDY'
    ).toString().toUpperCase();

    let pathway: Pathway = Pathway.STUDY;
    if (
      rawPathway.includes('AUSBILDUNG') ||
      rawPathway.includes('TRAINING') ||
      rawPathway.includes('VOCATIONAL')
    ) {
      pathway = Pathway.AUSBILDUNG;
    } else if (
      rawPathway.includes('EMPLOYMENT') ||
      rawPathway.includes('CAREER') ||
      rawPathway.includes('JOB') ||
      rawPathway.includes('WORK')
    ) {
      pathway = Pathway.EMPLOYMENT;
    }

    // 6. Check German level
    const profileGerman = comprehensiveProfile.languages?.germanLevel || fieldMap['germanLevel'];
    const germanLevelStr = (profileGerman || 'NONE').toString().toUpperCase();

    let actualGermanLevel: CEFRLevel | undefined = undefined;
    if (germanLevelStr.includes('C2') || germanLevelStr === 'C2') actualGermanLevel = CEFRLevel.C2;
    else if (germanLevelStr.includes('C1') || germanLevelStr === 'C1') actualGermanLevel = CEFRLevel.C1;
    else if (germanLevelStr.includes('B2') || germanLevelStr === 'B2') actualGermanLevel = CEFRLevel.B2;
    else if (germanLevelStr.includes('B1') || germanLevelStr === 'B1') actualGermanLevel = CEFRLevel.B1;
    else if (germanLevelStr.includes('A2') || germanLevelStr === 'A2') actualGermanLevel = CEFRLevel.A2;
    else if (germanLevelStr.includes('A1') || germanLevelStr === 'A1') actualGermanLevel = CEFRLevel.A1;

    const effectiveGermanLevel = germanLevelOverride !== undefined ? germanLevelOverride : actualGermanLevel;

    // 7. Run transparent scoring rules engine
    const evaluation = this.runTransparentRules({
      pathway,
      profile: comprehensiveProfile,
      fieldMap,
      uploadedTypes,
      hasUnresolvedInconsistencies,
      effectiveGermanLevel,
      actualGermanLevel,
      germanLevelOverride,
    });

    // 8. Pre-calculate simulations if needed
    if (!skipSimulations && germanLevelOverride === undefined) {
      const simulations: Record<string, QualificationEvaluation> = {};
      for (const lvl of [CEFRLevel.A1, CEFRLevel.A2, CEFRLevel.B1, CEFRLevel.B2]) {
        const sim = this.runTransparentRules({
          pathway,
          profile: comprehensiveProfile,
          fieldMap,
          uploadedTypes,
          hasUnresolvedInconsistencies,
          effectiveGermanLevel: lvl,
          actualGermanLevel,
          germanLevelOverride: lvl,
        });
        simulations[lvl] = sim;
      }
      evaluation.simulations = simulations;
    }

    // 9. Log to Agent Events
    if (germanLevelOverride === undefined) {
      await this.eventsService.logEvent({
        userId,
        agent: 'Qualification Agent',
        tool: 'TransparentRulesEngine',
        reason: `Evaluated comprehensive profile against German Admission & Visa Criteria for ${pathway}`,
        input: {
          pathway,
          primaryPathway: comprehensiveProfile.goals?.primaryPathway,
          germanLevel: actualGermanLevel || 'Not yet assessed',
          hasUnresolvedInconsistencies,
          scorePct: evaluation.scorePct,
          statusTier: evaluation.statusTier,
        },
        output: {
          status: evaluation.status,
          scorePct: evaluation.scorePct,
          statusTier: evaluation.statusTier,
          statusLabel: evaluation.statusLabel,
          factorCount: evaluation.factors?.length || 0,
          needsGermanSupport: evaluation.needsGermanSupport,
          passedCount: evaluation.passedCriteria.length,
          missingCount: evaluation.missingRequirements.length,
        },
        confidence: 1.0,
        durationMs: Date.now() - startTime,
      });
    }

    return evaluation;
  }

  runTransparentRules(inputs: {
    pathway: Pathway;
    profile: ComprehensiveApplicantProfile;
    fieldMap: Record<string, string>;
    uploadedTypes: Set<string>;
    hasUnresolvedInconsistencies: boolean;
    effectiveGermanLevel?: CEFRLevel;
    actualGermanLevel?: CEFRLevel;
    germanLevelOverride?: CEFRLevel;
  }): QualificationEvaluation {
    const {
      pathway,
      profile,
      fieldMap,
      uploadedTypes,
      hasUnresolvedInconsistencies,
      effectiveGermanLevel,
      actualGermanLevel,
    } = inputs;

    const factors: QualificationFactorScore[] = [];
    const passedCriteria: string[] = [];
    const missingRequirements: MissingRequirement[] = [];
    const nextSteps: NextStepActionItem[] = [];

    const hasDegreeDoc =
      uploadedTypes.has('DEGREE_CERTIFICATE') ||
      Boolean(profile.academic?.degreeCertificateAvailable) ||
      profile.documents?.documents?.some(
        (d) => d.documentType === 'DEGREE_CERTIFICATE' && d.uploadStatus === 'UPLOADED',
      );

    const hasTranscriptDoc =
      uploadedTypes.has('TRANSCRIPT') ||
      Boolean(profile.academic?.transcriptsAvailable) ||
      profile.documents?.documents?.some(
        (d) => d.documentType === 'TRANSCRIPT' && d.uploadStatus === 'UPLOADED',
      );

    const hasPassportDoc =
      uploadedTypes.has('PASSPORT') ||
      profile.personal?.passportStatus === 'HAVE_PASSPORT' ||
      profile.documents?.documents?.some(
        (d) => d.documentType === 'PASSPORT' && d.uploadStatus === 'UPLOADED',
      );

    // Calculate German Grade using Bavarian Formula
    let rawGpa: number | undefined = undefined;
    if (profile.academic?.scoreValue) {
      const parsed =
        typeof profile.academic.scoreValue === 'number'
          ? profile.academic.scoreValue
          : parseFloat(profile.academic.scoreValue);
      if (!isNaN(parsed) && parsed > 0) rawGpa = parsed;
    } else if (fieldMap['gradeOrGpa']) {
      const parsed = parseFloat(fieldMap['gradeOrGpa']);
      if (!isNaN(parsed) && parsed > 0) rawGpa = parsed;
    }

    const scale = profile.academic?.gradingScale || '10_POINT';
    let germanGrade: number | undefined = profile.academic?.estimatedGermanGrade;
    if ((germanGrade === undefined || germanGrade === 0) && rawGpa !== undefined && rawGpa > 0) {
      germanGrade = this.profileService.calculateGermanGrade(Number(rawGpa), scale);
    }

    const degreeName = profile.academic?.degreeName || fieldMap['degree'] || fieldMap['degreeName'] || '';
    const universityName = profile.academic?.institutionName || fieldMap['institution'] || '';
    const isAnabinRecognized =
      universityName.toLowerCase().includes('anna') ||
      universityName.toLowerCase().includes('university') ||
      universityName.toLowerCase().includes('institute') ||
      universityName.toLowerCase().includes('iit') ||
      universityName.toLowerCase().includes('nit') ||
      degreeName.toLowerCase().includes('bachelor') ||
      degreeName.toLowerCase().includes('technology');

    // --------------------------------------------------------------------------
    // PATHWAY 1: STUDY (Higher Education Master's / Bachelor's)
    // Total Max Points: 100
    // --------------------------------------------------------------------------
    if (pathway === Pathway.STUDY) {
      // 1. Academic Qualifications & German Grade (30 pts)
      let academicPoints = 12;
      let academicStatus: QualificationFactorScore['status'] = 'NEEDS_IMPROVEMENT';
      let academicStatusLabel = 'Academic Record Provisional';
      let academicReason = '';

      if (germanGrade !== undefined && germanGrade > 0) {
        if (germanGrade <= 1.5) {
          academicPoints = 30;
          academicStatus = 'EXCEEDS_REQUIREMENT';
          academicStatusLabel = `Outstanding German Grade (${germanGrade.toFixed(2)})`;
          academicReason = `Your converted grade is ${germanGrade.toFixed(2)} on the German 1.0–4.0 scale (Bavarian Formula). This places you in the top 10% bracket, clearing competitive NC (Numerus Clausus) cutoffs at top TU9 universities.`;
          passedCriteria.push(`Academic Excellence: Converted Bavarian Grade ${germanGrade.toFixed(2)} clears TU9 admission cutoffs.`);
        } else if (germanGrade <= 2.5) {
          academicPoints = 25;
          academicStatus = 'GOOD_MATCH';
          academicStatusLabel = `Meets University Cutoff (${germanGrade.toFixed(2)})`;
          academicReason = `Your converted German grade of ${germanGrade.toFixed(2)} satisfies the standard maximum cutoff (<= 2.5) for admission at public German research universities.`;
          passedCriteria.push(`Academic Foundation: Converted Bavarian Grade ${germanGrade.toFixed(2)} satisfies German university admission threshold.`);
        } else if (germanGrade <= 3.0) {
          academicPoints = 18;
          academicStatus = 'NEEDS_IMPROVEMENT';
          academicStatusLabel = `Conditional Match (${germanGrade.toFixed(2)})`;
          academicReason = `Your converted German grade is ${germanGrade.toFixed(2)}. While passing, some competitive state programs impose a 2.5 cutoff, meaning admission may depend on interviews, GRE scores, or non-NC programs.`;
        } else {
          academicPoints = 12;
          academicStatus = 'NEEDS_IMPROVEMENT';
          academicStatusLabel = `Below Standard Cutoff (${germanGrade.toFixed(2)})`;
          academicReason = `Your converted German grade of ${germanGrade.toFixed(2)} exceeds typical state university admission thresholds (> 3.0). Consider universities of applied sciences (Fachhochschulen) or preparatory programs.`;
        }
      } else if (degreeName) {
        academicPoints = 15;
        academicStatus = 'NEEDS_IMPROVEMENT';
        academicStatusLabel = 'Degree Stated, Grade Pending';
        academicReason = `You have listed "${degreeName}", but your CGPA/percentage has not been entered. The Bavarian Formula requires your numerical marks to calculate your exact German grade.`;
      } else {
        academicPoints = 8;
        academicStatus = 'MISSING_REQUIREMENT';
        academicStatusLabel = 'Academic Details Missing';
        academicReason = 'No degree name, university, or academic marks have been entered in your profile.';
      }

      factors.push({
        id: 'factor-academic',
        factorName: 'Academic Qualifications & German Grade (Bavarian Formula)',
        category: 'ACADEMIC',
        status: academicStatus,
        statusLabel: academicStatusLabel,
        pointsEarned: academicPoints,
        maxPoints: 30,
        percentageContribution: academicPoints,
        reason: academicReason,
        missingItems: !rawGpa ? ['Numerical CGPA / Percentage', 'Grading Scale'] : undefined,
        recommendedAction: rawGpa
          ? 'Verify your institution has verified H+ comparability status on the Anabin database.'
          : 'Enter your exact final CGPA or percentage in the Academic Background section to calculate your German grade.',
        actionRoute: '/journey/details',
      });

      // 2. German Language Proficiency (20 pts)
      let germanPoints = 0;
      let germanStatus: QualificationFactorScore['status'] = 'MISSING_REQUIREMENT';
      let germanStatusLabel = 'Not Started';
      let germanReason = '';

      if (effectiveGermanLevel === CEFRLevel.C1 || effectiveGermanLevel === CEFRLevel.C2) {
        germanPoints = 20;
        germanStatus = 'EXCEEDS_REQUIREMENT';
        germanStatusLabel = `Certified Fluent (${effectiveGermanLevel})`;
        germanReason = `German ${effectiveGermanLevel} proficiency fulfills 100% of admission requirements for both German-taught and English-taught university programs.`;
        passedCriteria.push(`Language Proficiency: German ${effectiveGermanLevel} qualifies for direct admission to all programs.`);
      } else if (effectiveGermanLevel === CEFRLevel.B2) {
        germanPoints = 18;
        germanStatus = 'GOOD_MATCH';
        germanStatusLabel = 'Upper Intermediate (B2)';
        germanReason = 'German B2 satisfies admission prerequisites for most German-taught master’s and bachelor’s degree programs.';
        passedCriteria.push('Language Proficiency: German B2 qualifies for bilingual and German-taught university curricula.');
      } else if (effectiveGermanLevel === CEFRLevel.B1) {
        germanPoints = 14;
        germanStatus = 'GOOD_MATCH';
        germanStatusLabel = 'Intermediate (B1)';
        germanReason = 'German B1 qualifies for bilingual degrees, Studienkolleg, and provides a strong foundation for daily integration during English-taught studies.';
        passedCriteria.push('Language Proficiency: German B1 satisfies foundation criteria for English-taught degrees.');
      } else if (effectiveGermanLevel === CEFRLevel.A2) {
        germanPoints = 8;
        germanStatus = 'NEEDS_IMPROVEMENT';
        germanStatusLabel = 'Elementary (A2)';
        germanReason = 'Your profile indicates A2 German. While eligible for English-taught degrees, reaching B1 significantly improves post-study job prospects and visa confidence.';
      } else if (effectiveGermanLevel === CEFRLevel.A1) {
        germanPoints = 4;
        germanStatus = 'NEEDS_IMPROVEMENT';
        germanStatusLabel = 'Beginner (A1)';
        germanReason = 'German A1 represents basic knowledge. English-taught degree admissions are accessible, but advancing to B1 before arrival in Germany is strongly advised.';
      } else {
        germanPoints = 0;
        germanStatus = 'MISSING_REQUIREMENT';
        germanStatusLabel = 'Not Yet Started';
        germanReason = 'No German proficiency reported. While many English-medium master’s do not require German for initial admission, learning basic German is crucial for visa interviews and living in Germany.';
      }

      factors.push({
        id: 'factor-german',
        factorName: 'German Language Proficiency',
        category: 'GERMAN',
        status: germanStatus,
        statusLabel: germanStatusLabel,
        pointsEarned: germanPoints,
        maxPoints: 20,
        percentageContribution: germanPoints,
        reason: germanReason,
        missingItems: (!effectiveGermanLevel || effectiveGermanLevel === CEFRLevel.NONE) ? ['German CEFR Assessment / Level'] : undefined,
        recommendedAction: effectiveGermanLevel && effectiveGermanLevel !== CEFRLevel.NONE
          ? 'Continue your structured German coursework to reach certified B1/B2.'
          : 'Start our free German A1 beginner video modules to satisfy visa readiness.',
        actionRoute: '/learning-path',
      });

      // 3. English Language Proficiency (15 pts)
      const englishLevel = (profile.languages?.englishLevel || '').toString().toUpperCase();
      const englishScore = parseFloat(String(profile.languages?.englishScore || '0')) || 0;
      let englishPoints = 5;
      let englishStatus: QualificationFactorScore['status'] = 'NEEDS_IMPROVEMENT';
      let englishStatusLabel = 'Test Score Pending';
      let englishReason = '';

      if (englishScore >= 7.0 || englishLevel === 'C1' || englishLevel === 'C2' || englishLevel.includes('NATIVE') || englishLevel.includes('ADVANCED')) {
        englishPoints = 15;
        englishStatus = 'EXCEEDS_REQUIREMENT';
        englishStatusLabel = `Strong Proficiency (${englishScore > 0 ? `IELTS ${englishScore}` : englishLevel})`;
        englishReason = 'Your English proficiency meets and exceeds the minimum threshold for all English-taught master’s programs in Germany.';
        passedCriteria.push('English Language: High band score satisfies international university requirements.');
      } else if (englishScore >= 6.5 || englishLevel === 'B2' || englishLevel.includes('PROFICIENT') || englishLevel.includes('UPPER') || englishLevel === 'FLUENT') {
        englishPoints = 13;
        englishStatus = 'GOOD_MATCH';
        englishStatusLabel = `Standard Criteria Met (${englishScore > 0 ? `IELTS ${englishScore}` : 'B2 / Fluent'})`;
        englishReason = 'Meets the standard requirement (IELTS 6.5 / TOEFL 80+) for English-medium master’s degrees across German state universities.';
        passedCriteria.push('English Language: Standard admission threshold (IELTS 6.5+ equivalent) fulfilled.');
      } else if (englishScore >= 6.0 || englishLevel === 'B1' || englishLevel === 'INTERMEDIATE') {
        englishPoints = 9;
        englishStatus = 'NEEDS_IMPROVEMENT';
        englishStatusLabel = `Borderline Score (${englishScore > 0 ? `IELTS ${englishScore}` : 'Intermediate'})`;
        englishReason = 'Some German universities require minimum IELTS 6.5. A 6.0 score limits your selection to fewer institutions.';
      } else {
        englishPoints = 5;
        englishStatus = 'MISSING_REQUIREMENT';
        englishStatusLabel = 'Test Certificate Missing';
        englishReason = 'No official IELTS/TOEFL scorecard or university Medium of Instruction (MOI) certificate was found.';
      }

      factors.push({
        id: 'factor-english',
        factorName: 'English Language Proficiency (IELTS / TOEFL)',
        category: 'ENGLISH',
        status: englishStatus,
        statusLabel: englishStatusLabel,
        pointsEarned: englishPoints,
        maxPoints: 15,
        percentageContribution: englishPoints,
        reason: englishReason,
        missingItems: englishPoints < 10 ? ['Official IELTS / TOEFL Scorecard or MOI Certificate'] : undefined,
        recommendedAction: englishPoints >= 13
          ? 'Keep your test scorecard handy (valid within 2 years of application date).'
          : 'Schedule an IELTS/TOEFL test or request an English Medium of Instruction letter from your university registrar.',
        actionRoute: '/journey/details',
      });

      // 4. Course Prerequisites & ECTS Alignment (15 pts)
      const backlogs = profile.academic?.backlogsCount;
      const specialization = profile.academic?.streamOrSpecialization || degreeName;
      let prereqPoints = 10;
      let prereqStatus: QualificationFactorScore['status'] = 'GOOD_MATCH';
      let prereqStatusLabel = 'Prerequisites Aligned';
      let prereqReason = '';

      if (backlogs === 0 && specialization) {
        prereqPoints = 15;
        prereqStatus = 'GOOD_MATCH';
        prereqStatusLabel = 'Clean Academic Record (0 Backlogs)';
        prereqReason = `Zero backlogs and focused degree coursework in ${specialization} provide a solid foundation matching German subject-specific ECTS credit requirements.`;
        passedCriteria.push('Academic History: Clear academic record with zero backlogs.');
      } else if (backlogs !== undefined && backlogs <= 2) {
        prereqPoints = 10;
        prereqStatus = 'GOOD_MATCH';
        prereqStatusLabel = `Minor Backlogs (${backlogs} Cleared/Reported)`;
        prereqReason = 'German universities accept cleared backlogs as long as your total degree credits (180–240 ECTS equivalent) and subject prerequisites are fulfilled.';
      } else if (backlogs !== undefined && backlogs > 2) {
        prereqPoints = 6;
        prereqStatus = 'NEEDS_IMPROVEMENT';
        prereqStatusLabel = `Multiple Backlogs (${backlogs} Reported)`;
        prereqReason = `Having ${backlogs} backlogs may trigger additional review by the admissions committee. Focus on highlighting strong subject marks in core modules.`;
      } else {
        prereqPoints = 8;
        prereqStatus = 'NEEDS_IMPROVEMENT';
        prereqStatusLabel = 'Prerequisites Provisional';
        prereqReason = 'Backlog count and module specialization details are not fully specified. Update your academic profile to confirm.';
      }

      factors.push({
        id: 'factor-prereq',
        factorName: 'Course Prerequisites & ECTS Credit Alignment',
        category: 'PREREQUISITES',
        status: prereqStatus,
        statusLabel: prereqStatusLabel,
        pointsEarned: prereqPoints,
        maxPoints: 15,
        percentageContribution: prereqPoints,
        reason: prereqReason,
        missingItems: backlogs === undefined ? ['Backlogs / Academic History Clarification'] : undefined,
        recommendedAction: 'Verify that your undergraduate transcript contains at least 30–40 ECTS in core mathematics and foundational subjects for your target program.',
        actionRoute: '/journey/details',
      });

      // 5. Required Official Documents & Verification (10 pts)
      let docCount = 0;
      if (hasDegreeDoc) docCount++;
      if (hasTranscriptDoc) docCount++;
      if (hasPassportDoc) docCount++;

      let docPoints = 2;
      let docStatus: QualificationFactorScore['status'] = 'MISSING_REQUIREMENT';
      let docStatusLabel = 'Uploads Pending';
      let docReason = '';

      if (docCount === 3) {
        docPoints = 10;
        docStatus = 'GOOD_MATCH';
        docStatusLabel = 'All Core Documents Uploaded';
        docReason = 'Degree Certificate, Academic Transcripts, and Valid Passport are confirmed. Your file is ready for APS India verification.';
        passedCriteria.push('Official Documents: Degree certificate, transcripts, and passport in order.');
      } else if (docCount === 2) {
        docPoints = 7;
        docStatus = 'NEEDS_IMPROVEMENT';
        docStatusLabel = `Partial Documents (${docCount}/3 Ready)`;
        docReason = 'Two of the three essential documents are ready. Please upload the remaining document to complete your APS package.';
      } else if (docCount === 1) {
        docPoints = 4;
        docStatus = 'NEEDS_IMPROVEMENT';
        docStatusLabel = `Key Documents Missing (${docCount}/3 Ready)`;
        docReason = 'Only one required document is present. Official degree certificates and transcripts are required for credential verification.';
      } else {
        docPoints = 2;
        docStatus = 'MISSING_REQUIREMENT';
        docStatusLabel = 'No Documents Uploaded';
        docReason = 'No official educational documents or passport scans uploaded yet. Official verification cannot proceed without documentation.';
      }

      const missingDocsList: string[] = [];
      if (!hasDegreeDoc) missingDocsList.push('Degree Certificate / Provisional');
      if (!hasTranscriptDoc) missingDocsList.push('Consolidated Academic Transcripts');
      if (!hasPassportDoc) missingDocsList.push('Valid Passport Copy (1+ Year Validity)');

      factors.push({
        id: 'factor-documents',
        factorName: 'Required Documents & APS Verification Readiness',
        category: 'DOCUMENTS',
        status: docStatus,
        statusLabel: docStatusLabel,
        pointsEarned: docPoints,
        maxPoints: 10,
        percentageContribution: docPoints,
        reason: docReason,
        missingItems: missingDocsList.length > 0 ? missingDocsList : undefined,
        recommendedAction: missingDocsList.length > 0
          ? `Upload your ${missingDocsList[0]} in the Document Review step.`
          : 'All core documents are uploaded. Ready for official APS submission.',
        actionRoute: '/journey/documents',
      });

      // 6. Standardized Tests & Entrance Examinations (10 pts)
      const entranceExams = profile.exams?.exams || [];
      const hasTakenExams =
        profile.exams?.hasTakenEntranceExams ||
        entranceExams.some((e) => e.status === 'TAKEN' || (e.score && e.score.length > 0));

      let examPoints = 8;
      let examStatus: QualificationFactorScore['status'] = 'GOOD_MATCH';
      let examStatusLabel = 'Standard Exemption Applied';
      let examReason = '';

      if (hasTakenExams) {
        examPoints = 10;
        examStatus = 'EXCEEDS_REQUIREMENT';
        examStatusLabel = 'Entrance Exam Completed';
        examReason = 'Reported GRE, GATE, or TestAS examination scores provide a competitive edge for selective TU9 university departments.';
        passedCriteria.push('Competitive Edge: Standardized entrance examination score reported.');
      } else if (isAnabinRecognized && (germanGrade ? germanGrade <= 2.5 : true)) {
        examPoints = 8;
        examStatus = 'GOOD_MATCH';
        examStatusLabel = 'Standard University Exemption';
        examReason = 'Most German state universities do not mandate GRE/GATE when your undergraduate degree is recognized and GPA meets criteria.';
      } else {
        examPoints = 5;
        examStatus = 'NEEDS_IMPROVEMENT';
        examStatusLabel = 'Optional Test Score Not Available';
        examReason = 'No GRE or TestAS scores reported. While optional for most programs, taking TestAS or GRE can compensate for borderline grades.';
      }

      factors.push({
        id: 'factor-exams',
        factorName: 'Standardized Tests & Entrance Examinations (GRE / TestAS)',
        category: 'EXAMS',
        status: examStatus,
        statusLabel: examStatusLabel,
        pointsEarned: examPoints,
        maxPoints: 10,
        percentageContribution: examPoints,
        reason: examReason,
        missingItems: !hasTakenExams ? ['Optional GRE / TestAS Score'] : undefined,
        recommendedAction: 'Check target university requirements: most public universities waive GRE, but top programs (e.g. RWTH Aachen, TUM) view GRE scores favorably.',
        actionRoute: '/journey/details',
      });

    // --------------------------------------------------------------------------
    // PATHWAY 2: AUSBILDUNG (Dual Vocational Training)
    // Total Max Points: 100
    // --------------------------------------------------------------------------
    } else if (pathway === Pathway.AUSBILDUNG) {
      // 1. German Language Proficiency (Mandatory for Berufsschule) (35 pts)
      let germanPoints = 0;
      let germanStatus: QualificationFactorScore['status'] = 'MISSING_REQUIREMENT';
      let germanStatusLabel = 'Not Started';
      let germanReason = '';

      if (effectiveGermanLevel === CEFRLevel.B2 || effectiveGermanLevel === CEFRLevel.C1 || effectiveGermanLevel === CEFRLevel.C2) {
        germanPoints = 35;
        germanStatus = 'EXCEEDS_REQUIREMENT';
        germanStatusLabel = `B2 Upper Intermediate (${effectiveGermanLevel})`;
        germanReason = 'German B2 satisfies mandatory classroom requirements at German vocational colleges (Berufsschule) and places you at the front of employer hiring.';
        passedCriteria.push(`Vocational Readiness: German ${effectiveGermanLevel} meets Berufsschule instruction standard.`);
      } else if (effectiveGermanLevel === CEFRLevel.B1) {
        germanPoints = 28;
        germanStatus = 'GOOD_MATCH';
        germanStatusLabel = 'B1 Intermediate (Minimum Legal Requirement)';
        germanReason = 'German B1 fulfills the legal baseline for vocational training visa issuance and dual apprenticeship contracts.';
        passedCriteria.push('Language Baseline: German B1 satisfies minimum visa requirement for Ausbildung.');
      } else if (effectiveGermanLevel === CEFRLevel.A2) {
        germanPoints = 15;
        germanStatus = 'NEEDS_IMPROVEMENT';
        germanStatusLabel = 'A2 Elementary (Pre-Training Needed)';
        germanReason = 'Your profile indicates A2 German. German law and training employers require at least B1 before visa processing. Complete B1 coursework.';
      } else if (effectiveGermanLevel === CEFRLevel.A1) {
        germanPoints = 8;
        germanStatus = 'NEEDS_IMPROVEMENT';
        germanStatusLabel = 'A1 Beginner';
        germanReason = 'German A1 is an early stage. Plan ~4 months of focused study to reach the mandatory B1 level required for training contracts.';
      } else {
        germanPoints = 0;
        germanStatus = 'MISSING_REQUIREMENT';
        germanStatusLabel = 'German Not Started';
        germanReason = 'Ausbildung instruction is conducted 100% in German. Reaching at least certified B1 is an absolute legal prerequisite.';
      }

      factors.push({
        id: 'factor-german',
        factorName: 'German Language Proficiency (Mandatory for Berufsschule)',
        category: 'GERMAN',
        status: germanStatus,
        statusLabel: germanStatusLabel,
        pointsEarned: germanPoints,
        maxPoints: 35,
        percentageContribution: germanPoints,
        reason: germanReason,
        missingItems: (!effectiveGermanLevel || effectiveGermanLevel === CEFRLevel.NONE) ? ['German B1/B2 Certification'] : undefined,
        recommendedAction: 'Dedicate 10–12 hours weekly to our guided German learning path to reach certified B1.',
        actionRoute: '/learning-path',
      });

      // 2. School Education & Academic Foundation (25 pts)
      const highestQual = (profile.academic?.highestCompletedQualification || '').toUpperCase();
      let schoolPoints = 15;
      let schoolStatus: QualificationFactorScore['status'] = 'GOOD_MATCH';
      let schoolStatusLabel = 'School Foundation Verified';
      let schoolReason = '';

      if (rawGpa && rawGpa >= 65) {
        schoolPoints = 25;
        schoolStatus = 'EXCEEDS_REQUIREMENT';
        schoolStatusLabel = `12th Standard Passed (${rawGpa}% / First Class)`;
        schoolReason = 'Indian 12th Standard completion with >65% satisfies equivalence to the German Realschulabschluss / Abitur baseline required for high-demand apprenticeships.';
        passedCriteria.push('School Education: 12th standard first-class completion equivalent to German secondary diploma.');
      } else if (rawGpa && rawGpa >= 50) {
        schoolPoints = 20;
        schoolStatus = 'GOOD_MATCH';
        schoolStatusLabel = `12th Standard Passed (${rawGpa}%)`;
        schoolReason = 'Indian 12th standard pass fulfills basic qualification standards for dual vocational training contracts in Germany.';
        passedCriteria.push('School Education: 12th standard certificate fulfills basic entry criteria.');
      } else if (highestQual.includes('10TH') || highestQual.includes('HIGH_SCHOOL')) {
        schoolPoints = 15;
        schoolStatus = 'NEEDS_IMPROVEMENT';
        schoolStatusLabel = '10th Standard (Hauptschule Equivalent)';
        schoolReason = '10th standard satisfies German Hauptschulabschluss. Some competitive technical programs may prefer 12th standard completion.';
      } else {
        schoolPoints = 12;
        schoolStatus = 'NEEDS_IMPROVEMENT';
        schoolStatusLabel = 'School Records Incomplete';
        schoolReason = 'Please confirm 10th and 12th standard completion details and percentage in your profile.';
      }

      factors.push({
        id: 'factor-academic',
        factorName: 'School Education & Secondary Foundation',
        category: 'ACADEMIC',
        status: schoolStatus,
        statusLabel: schoolStatusLabel,
        pointsEarned: schoolPoints,
        maxPoints: 25,
        percentageContribution: schoolPoints,
        reason: schoolReason,
        missingItems: !rawGpa ? ['12th / 10th Standard Marksheet Details'] : undefined,
        recommendedAction: 'Enter your 10th and 12th school completion marks and stream in your profile.',
        actionRoute: '/journey/details',
      });

      // 3. Practical Experience & Vocational Aptitude (20 pts)
      const expYears = typeof profile.experience?.totalExperienceYears === 'number'
        ? profile.experience.totalExperienceYears
        : parseFloat(String(profile.experience?.totalExperienceYears || '0')) || 0;
      const hasExp = expYears > 0 || (profile.experience?.jobs && profile.experience.jobs.length > 0);

      let expPoints = 8;
      let expStatus: QualificationFactorScore['status'] = 'NEEDS_IMPROVEMENT';
      let expStatusLabel = 'Entry-Level Applicant';
      let expReason = '';

      if (hasExp && expYears >= 1) {
        expPoints = 20;
        expStatus = 'EXCEEDS_REQUIREMENT';
        expStatusLabel = `Practical Background (${expYears}+ Years)`;
        expReason = 'Prior hands-on vocational, trade, or internship experience gives you a substantial advantage during German employer interviews.';
        passedCriteria.push('Practical Aptitude: Prior vocational or internship experience verified.');
      } else if (hasExp) {
        expPoints = 14;
        expStatus = 'GOOD_MATCH';
        expStatusLabel = 'Basic Practical Exposure';
        expReason = 'Some practical exposure or training reported. German employers value demonstrated initiative in the chosen trade.';
      } else {
        expPoints = 10;
        expStatus = 'NEEDS_IMPROVEMENT';
        expStatusLabel = 'Fresher / School Leaver';
        expReason = 'Ausbildung is designed for school leavers, so lack of experience is not disqualifying. Emphasize motivation and school projects in your Lebenslauf.';
      }

      factors.push({
        id: 'factor-experience',
        factorName: 'Practical Experience & Vocational Aptitude',
        category: 'EXPERIENCE',
        status: expStatus,
        statusLabel: expStatusLabel,
        pointsEarned: expPoints,
        maxPoints: 20,
        percentageContribution: expPoints,
        reason: expReason,
        recommendedAction: 'Highlight any hands-on technical, nursing, or hospitality projects in your German-format CV.',
        actionRoute: '/journey/cv',
      });

      // 4. Official Documents & Passport Validity (10 pts)
      let ausbDocPoints = 2;
      let ausbDocStatus: QualificationFactorScore['status'] = 'MISSING_REQUIREMENT';
      let ausbDocStatusLabel = 'Documents Incomplete';
      let ausbDocReason = '';

      if (hasPassportDoc && (hasDegreeDoc || hasTranscriptDoc)) {
        ausbDocPoints = 10;
        ausbDocStatus = 'GOOD_MATCH';
        ausbDocStatusLabel = 'Passport & School Records Ready';
        ausbDocReason = 'Valid passport and educational certificates are verified for visa and contract filing.';
        passedCriteria.push('Identity & Records: Valid passport and school certificates ready.');
      } else if (hasPassportDoc) {
        ausbDocPoints = 6;
        ausbDocStatus = 'NEEDS_IMPROVEMENT';
        ausbDocStatusLabel = 'Passport Ready, Certificates Missing';
        ausbDocReason = 'Passport confirmed, but school completion certificates need to be uploaded.';
      } else {
        ausbDocPoints = 3;
        ausbDocStatus = 'MISSING_REQUIREMENT';
        ausbDocStatusLabel = 'Passport & Certificates Missing';
        ausbDocReason = 'A valid passport (with at least 1 year validity) is required for German visa processing.';
      }

      factors.push({
        id: 'factor-documents',
        factorName: 'Official Documents & Passport Validity',
        category: 'DOCUMENTS',
        status: ausbDocStatus,
        statusLabel: ausbDocStatusLabel,
        pointsEarned: ausbDocPoints,
        maxPoints: 10,
        percentageContribution: ausbDocPoints,
        reason: ausbDocReason,
        missingItems: !hasPassportDoc ? ['Valid Passport Scan'] : undefined,
        recommendedAction: 'Upload your passport and school leaving marksheets in Document Review.',
        actionRoute: '/journey/documents',
      });

      // 5. Communication & English Baseline (10 pts)
      const commPoints = 10;
      factors.push({
        id: 'factor-english',
        factorName: 'Communication & Intercultural Aptitude',
        category: 'ENGLISH',
        status: 'GOOD_MATCH',
        statusLabel: 'Baseline Confirmed',
        pointsEarned: commPoints,
        maxPoints: 10,
        percentageContribution: commPoints,
        reason: 'Basic English communication and interpersonal skills support transition into German workplace environments.',
        recommendedAction: 'Prepare for video interview etiquette with German training sponsors.',
        actionRoute: '/journey/details',
      });

    // --------------------------------------------------------------------------
    // PATHWAY 3: EMPLOYMENT (Skilled Immigration / EU Blue Card)
    // Total Max Points: 100
    // --------------------------------------------------------------------------
    } else {
      // 1. Professional Work Experience & Skill Depth (30 pts)
      const expYears = typeof profile.experience?.totalExperienceYears === 'number'
        ? profile.experience.totalExperienceYears
        : parseFloat(String(profile.experience?.totalExperienceYears || '0')) || 0;

      let expPoints = 8;
      let expStatus: QualificationFactorScore['status'] = 'NEEDS_IMPROVEMENT';
      let expStatusLabel = 'Limited Experience';
      let expReason = '';

      if (expYears >= 5) {
        expPoints = 30;
        expStatus = 'EXCEEDS_REQUIREMENT';
        expStatusLabel = `Senior Level (${expYears}+ Years)`;
        expReason = `Your ${expYears} years of professional experience satisfy the requirements for fast-track EU Blue Card processing and high-tier Opportunity Card points.`;
        passedCriteria.push(`Skilled Experience: ${expYears} years meets senior skilled worker criteria.`);
      } else if (expYears >= 2) {
        expPoints = 25;
        expStatus = 'GOOD_MATCH';
        expStatusLabel = `Mid-Level (${expYears} Years)`;
        expReason = `Your ${expYears} years of skilled experience meet EU Blue Card prerequisites for university graduates under the German Skilled Immigration Act.`;
        passedCriteria.push('Skilled Experience: Fulfills Blue Card minimum threshold for recognized graduates.');
      } else if (expYears >= 1) {
        expPoints = 18;
        expStatus = 'NEEDS_IMPROVEMENT';
        expStatusLabel = `Junior Level (${expYears} Year)`;
        expReason = '1 year of experience meets Opportunity Card entry criteria, but competitive employer matching benefits from 2+ years of verified work.';
      } else {
        expPoints = 8;
        expStatus = 'NEEDS_IMPROVEMENT';
        expStatusLabel = 'Fresher (<1 Year)';
        expReason = 'Direct work visas require verified professional experience. Consider the Study (Master’s) or Ausbildung pathways for entry into Germany.';
      }

      factors.push({
        id: 'factor-experience',
        factorName: 'Professional Work Experience & Skill Depth',
        category: 'EXPERIENCE',
        status: expStatus,
        statusLabel: expStatusLabel,
        pointsEarned: expPoints,
        maxPoints: 30,
        percentageContribution: expPoints,
        reason: expReason,
        missingItems: expYears < 2 ? ['Experience Letters / Service Certificates'] : undefined,
        recommendedAction: 'Add detailed roles, technologies, and achievements to your work history.',
        actionRoute: '/journey/details',
      });

      // 2. Academic Degree & Anabin H+ Recognition (25 pts)
      let degPoints = 10;
      let degStatus: QualificationFactorScore['status'] = 'NEEDS_IMPROVEMENT';
      let degStatusLabel = 'Recognition Pending';
      let degReason = '';

      if (hasDegreeDoc && isAnabinRecognized) {
        degPoints = 25;
        degStatus = 'EXCEEDS_REQUIREMENT';
        degStatusLabel = 'Anabin H+ Recognized Institution';
        degReason = 'Your academic degree is confirmed from an institution recognized as H+ on the German ZAB/Anabin database, satisfying §18g AufenthG.';
        passedCriteria.push('Academic Degree: Anabin H+ comparability verified for EU Blue Card.');
      } else if (degreeName) {
        degPoints = 18;
        degStatus = 'GOOD_MATCH';
        degStatusLabel = 'Degree Stated, ZAB Verification Needed';
        degReason = 'Your degree information is recorded, but formal ZAB comparability or degree certificate upload is needed to finalize verification.';
      } else {
        degPoints = 8;
        degStatus = 'MISSING_REQUIREMENT';
        degStatusLabel = 'Degree Information Incomplete';
        degReason = 'No university degree details recorded. A recognized bachelor’s or master’s degree is required for the EU Blue Card.';
      }

      factors.push({
        id: 'factor-academic',
        factorName: 'Academic Degree & Anabin H+ Recognition',
        category: 'ACADEMIC',
        status: degStatus,
        statusLabel: degStatusLabel,
        pointsEarned: degPoints,
        maxPoints: 25,
        percentageContribution: degPoints,
        reason: degReason,
        missingItems: !hasDegreeDoc ? ['Official Degree Certificate Scan'] : undefined,
        recommendedAction: 'Upload your Degree Certificate in Document Review for instant Anabin verification.',
        actionRoute: '/journey/documents',
      });

      // 3. Language Fluency (English & German Integration) (20 pts)
      const englishLevel = (profile.languages?.englishLevel || '').toString().toUpperCase();
      let langPoints = 8;
      let langStatus: QualificationFactorScore['status'] = 'NEEDS_IMPROVEMENT';
      let langStatusLabel = 'Basic Language Skills';
      let langReason = '';

      const isEnglishFluent =
        englishLevel.includes('C1') ||
        englishLevel.includes('ADVANCED') ||
        englishLevel.includes('NATIVE') ||
        englishLevel.includes('B2') ||
        englishLevel.includes('PROFICIENT') ||
        englishLevel === 'FLUENT';
      const isGermanIntermediate =
        effectiveGermanLevel === CEFRLevel.B1 ||
        effectiveGermanLevel === CEFRLevel.B2 ||
        effectiveGermanLevel === CEFRLevel.C1 ||
        effectiveGermanLevel === CEFRLevel.C2;

      if (isEnglishFluent && isGermanIntermediate) {
        langPoints = 20;
        langStatus = 'EXCEEDS_REQUIREMENT';
        langStatusLabel = `Bilingual Professional (English + German ${effectiveGermanLevel})`;
        langReason = 'High English proficiency combined with intermediate German opens maximum job vacancies across both international and mid-sized German enterprises (Mittelstand).';
        passedCriteria.push('Language Flexibility: Strong English and conversational German.');
      } else if (isEnglishFluent) {
        langPoints = 15;
        langStatus = 'GOOD_MATCH';
        langStatusLabel = 'Fluent English (German Pending)';
        langReason = 'English fluency satisfies hiring requirements for tech hubs (Berlin, Munich, Frankfurt), but acquiring B1 German significantly widens employer reach.';
        passedCriteria.push('Language Baseline: Professional English fluency meets multinational hiring standards.');
      } else if (isGermanIntermediate) {
        langPoints = 14;
        langStatus = 'GOOD_MATCH';
        langStatusLabel = `German Intermediate (${effectiveGermanLevel})`;
        langReason = 'Intermediate German satisfies local business communication requirements.';
      } else {
        langPoints = 6;
        langStatus = 'MISSING_REQUIREMENT';
        langStatusLabel = 'Language Scores Pending';
        langReason = 'Please report your English proficiency and German learning status.';
      }

      factors.push({
        id: 'factor-german',
        factorName: 'Language Fluency (English & German Integration)',
        category: 'GERMAN',
        status: langStatus,
        statusLabel: langStatusLabel,
        pointsEarned: langPoints,
        maxPoints: 20,
        percentageContribution: langPoints,
        reason: langReason,
        recommendedAction: 'Start German A1/A2 learning modules to boost Opportunity Card scoring points.',
        actionRoute: '/learning-path',
      });

      // 4. Shortage Occupation & Blue Card Threshold (15 pts)
      const targetField = (
        profile.goals?.preferredFieldOrIndustry ||
        profile.employmentPrefs?.targetIndustry ||
        ''
      ).toLowerCase();

      let shortagePoints = 10;
      let shortageStatus: QualificationFactorScore['status'] = 'GOOD_MATCH';
      let shortageStatusLabel = 'Skilled Occupation';
      let shortageReason = '';

      if (
        targetField.includes('software') ||
        targetField.includes('computer') ||
        targetField.includes('it') ||
        targetField.includes('engineer') ||
        targetField.includes('data') ||
        targetField.includes('nurs') ||
        targetField.includes('tech')
      ) {
        shortagePoints = 15;
        shortageStatus = 'EXCEEDS_REQUIREMENT';
        shortageStatusLabel = 'Official Shortage Occupation (MINT/STEM)';
        shortageReason = 'Your specialization falls under Germany’s official shortage occupation list (§18g MINT), qualifying you for a significantly reduced salary threshold for EU Blue Card issuance.';
        passedCriteria.push('Immigration Policy: Qualifies under MINT Shortage Occupation salary threshold.');
      } else {
        shortagePoints = 10;
        shortageStatus = 'GOOD_MATCH';
        shortageStatusLabel = 'Standard Skilled Category';
        shortageReason = 'Your field falls under general skilled employment. Standard EU Blue Card minimum salary thresholds apply.';
      }

      factors.push({
        id: 'factor-prereq',
        factorName: 'Shortage Occupation & Salary Threshold Match',
        category: 'PREREQUISITES',
        status: shortageStatus,
        statusLabel: shortageStatusLabel,
        pointsEarned: shortagePoints,
        maxPoints: 15,
        percentageContribution: shortagePoints,
        reason: shortageReason,
        recommendedAction: 'Ensure your German-style Lebenslauf highlights technical domain competencies.',
        actionRoute: '/journey/cv',
      });

      // 5. Documentation, Experience Letters & Portfolio (10 pts)
      let empDocPoints = 4;
      let empDocStatus: QualificationFactorScore['status'] = 'NEEDS_IMPROVEMENT';
      let empDocStatusLabel = 'Documentation Pending';
      let empDocReason = '';

      if (hasDegreeDoc && hasPassportDoc) {
        empDocPoints = 10;
        empDocStatus = 'GOOD_MATCH';
        empDocStatusLabel = 'Key Documents Ready';
        empDocReason = 'Degree certificate and passport are ready for visa filing and credential verification.';
        passedCriteria.push('Credentials: Core legal documents ready.');
      } else if (hasPassportDoc) {
        empDocPoints = 6;
        empDocStatus = 'NEEDS_IMPROVEMENT';
        empDocStatusLabel = 'Passport Ready, Degree Missing';
        empDocReason = 'Passport scan verified, but degree certificate scan is required for official comparability.';
      } else {
        empDocPoints = 3;
        empDocStatus = 'MISSING_REQUIREMENT';
        empDocStatusLabel = 'Uploads Missing';
        empDocReason = 'Please upload your passport and official degree certificate.';
      }

      factors.push({
        id: 'factor-documents',
        factorName: 'Documentation, Experience Letters & Portfolio',
        category: 'DOCUMENTS',
        status: empDocStatus,
        statusLabel: empDocStatusLabel,
        pointsEarned: empDocPoints,
        maxPoints: 10,
        percentageContribution: empDocPoints,
        reason: empDocReason,
        recommendedAction: 'Upload official experience letters and degree certificates in Document Review.',
        actionRoute: '/journey/documents',
      });
    }

    // --------------------------------------------------------------------------
    // MATHEMATICALLY CONSISTENT OVERALL SCORE
    // --------------------------------------------------------------------------
    let totalScore = factors.reduce((sum, f) => sum + f.pointsEarned, 0);

    // Apply Inconsistency Penalty if any unresolved discrepancies exist
    if (hasUnresolvedInconsistencies) {
      totalScore = Math.max(20, totalScore - 15);
      missingRequirements.push({
        id: 'req-inconsistency-block',
        category: 'DOCUMENT',
        title: 'Unresolved Data Inconsistency Detected',
        description: 'You have conflicting information across documents and profile data that must be resolved prior to official verification.',
        severity: 'BLOCKING',
        actionableStep: 'Clarify the discrepancy in the Document Review step.',
      });
      nextSteps.unshift({
        id: 'step-inconsistencies',
        title: 'Resolve Document Inconsistencies',
        description: 'Discrepancies between your profile data and uploaded documents will delay official German verification.',
        priority: 'HIGH',
        category: 'Verification',
        targetRoute: '/journey/documents',
        ctaText: 'Resolve Discrepancies',
      });
    }

    const scorePct = Math.min(100, Math.max(0, Math.round(totalScore)));

    // Status Tier Mapping based on defined thresholds
    let statusTier: QualificationStatusTier = 'CONDITIONAL_MATCH';
    let statusLabel = 'Conditional Match';
    let status: QualificationStatus = QualificationStatus.CONDITIONAL;

    if (scorePct >= 80) {
      statusTier = 'STRONG_MATCH';
      statusLabel = 'Strong Match';
      status = QualificationStatus.ELIGIBLE;
    } else if (scorePct >= 65) {
      statusTier = 'GOOD_MATCH';
      statusLabel = 'Good Match';
      status = QualificationStatus.ELIGIBLE;
    } else if (scorePct >= 50) {
      statusTier = 'CONDITIONAL_MATCH';
      statusLabel = 'Conditional Match';
      status = QualificationStatus.CONDITIONAL;
    } else {
      statusTier = 'ACTION_REQUIRED';
      statusLabel = 'Action Required';
      status = QualificationStatus.CONDITIONAL;
    }

    // Check Provisional status: profile completeness < 60% or critical academic fields missing
    const isProvisional =
      !rawGpa ||
      !degreeName ||
      profile.status === 'DRAFT' ||
      (profile.completenessScore !== undefined && profile.completenessScore < 60);

    // German support flag
    const isAtLeastB1 =
      effectiveGermanLevel === CEFRLevel.B1 ||
      effectiveGermanLevel === CEFRLevel.B2 ||
      effectiveGermanLevel === CEFRLevel.C1 ||
      effectiveGermanLevel === CEFRLevel.C2;
    const hasReportedGerman = Boolean(
      effectiveGermanLevel && effectiveGermanLevel !== CEFRLevel.NONE
    );
    const needsGermanSupport = !hasReportedGerman || !isAtLeastB1;

    // Headline and Summary
    let headline = '';
    let summary = '';

    if (pathway === Pathway.STUDY) {
      if (statusTier === 'STRONG_MATCH') {
        headline = 'Eligible for German State Universities (Master’s / Bachelor’s)';
        summary = `Your converted Bavarian grade (${germanGrade ? germanGrade.toFixed(2) : 'Strong'}) and academic profile place you in the top tier for direct, tuition-free university admission in Germany.`;
      } else if (statusTier === 'GOOD_MATCH') {
        headline = 'Good Match for English-Taught University Programs';
        summary = 'You meet the core admission requirements for German universities. Completing pending document verifications or language milestones will maximize your acceptance chances.';
      } else if (statusTier === 'CONDITIONAL_MATCH') {
        headline = 'Conditionally Eligible for German Higher Education';
        summary = 'You have a viable academic foundation. Fulfilling language requirements, submitting official grades, or clearing document verifications is required before submitting applications.';
      } else {
        headline = 'Academic Profile Requires Completion';
        summary = 'Key educational or grade details are missing from your profile. Fill in your marks and academic background to unlock a verified eligibility assessment.';
      }
    } else if (pathway === Pathway.AUSBILDUNG) {
      if (statusTier === 'STRONG_MATCH') {
        headline = 'Directly Eligible for Dual Vocational Training (Ausbildung)';
        summary = 'Your German language proficiency and school education qualify you for paid apprenticeship contracts in IT, Healthcare, or Engineering in Germany.';
      } else if (statusTier === 'GOOD_MATCH') {
        headline = 'Strong Candidate for German Vocational Training';
        summary = 'Your educational background matches vocational standards. Reaching solid B1 German will secure apprenticeship contract offers with German employers.';
      } else if (statusTier === 'CONDITIONAL_MATCH') {
        headline = 'On-Track for Dual Vocational Training';
        summary = 'German vocational colleges (Berufsschule) require B1 German. Follow our guided learning path to reach interview readiness for upcoming intakes.';
      } else {
        headline = 'Ausbildung Profile Incomplete';
        summary = 'Enter your school completion marks and start foundational German to assess your vocational training readiness.';
      }
    } else {
      if (statusTier === 'STRONG_MATCH') {
        headline = 'Prime Candidate for EU Blue Card & Opportunity Card';
        summary = 'Your recognized degree and skilled work experience meet Germany’s Skilled Immigration Act criteria for fast-track work visa processing.';
      } else if (statusTier === 'GOOD_MATCH') {
        headline = 'Qualified for German Skilled Immigration Pathway';
        summary = 'Your professional profile is well positioned. Generating a German-format Lebenslauf and polishing your language skills will connect you with employers.';
      } else if (statusTier === 'CONDITIONAL_MATCH') {
        headline = 'Conditionally Qualified for German Job Market';
        summary = 'You have relevant skills, but degree recognition (ZAB comparability) or additional German fluency is recommended to widen employer interest.';
      } else {
        headline = 'Employment Profile Requires Work History Details';
        summary = 'Add your years of experience, university degree, and language proficiency to calculate your Skilled Worker points.';
      }
    }

    // Build Actionable Next Steps from factor metrics
    const academicFactor = factors.find((f) => f.category === 'ACADEMIC');
    const germanFactor = factors.find((f) => f.category === 'GERMAN');
    const englishFactor = factors.find((f) => f.category === 'ENGLISH');
    const docFactor = factors.find((f) => f.category === 'DOCUMENTS');

    // 1. German Next Step
    if (needsGermanSupport || (germanFactor && germanFactor.pointsEarned < germanFactor.maxPoints * 0.75)) {
      nextSteps.push({
        id: 'step-german',
        title: 'Accelerate German Language to B1/B2',
        description: `Current level is ${effectiveGermanLevel || 'Not assessed'}. Progressing to ${pathway === Pathway.AUSBILDUNG ? 'B1' : 'B2'} unlocks 80%+ more program slots and simplifies visa clearance.`,
        priority: 'HIGH',
        category: 'Language',
        targetRoute: '/learning-path',
        ctaText: 'Open German Learning Path',
      });
    }

    // 2. Academic / Grade Next Step
    if (!rawGpa || (academicFactor && academicFactor.pointsEarned < academicFactor.maxPoints * 0.8)) {
      nextSteps.push({
        id: 'step-academic-gpa',
        title: 'Complete Academic Marks & Calculate Bavarian Grade',
        description: 'Provide your final CGPA or percentage in the Academic Background section for exact German grade equivalence.',
        priority: 'HIGH',
        category: 'Academic',
        targetRoute: '/journey/details',
        ctaText: 'Update Academic Profile',
      });
    }

    // 3. Document Next Step
    if (docFactor && docFactor.pointsEarned < docFactor.maxPoints) {
      nextSteps.push({
        id: 'step-documents',
        title: 'Upload Official Educational Documents & Passport',
        description: 'Official degree certificates, transcripts, and passport copies are required for APS India verification.',
        priority: 'HIGH',
        category: 'Documents',
        targetRoute: '/journey/documents',
        ctaText: 'Upload Documents',
      });
    }

    // 4. English Next Step
    if (englishFactor && englishFactor.pointsEarned < englishFactor.maxPoints * 0.85) {
      nextSteps.push({
        id: 'step-english',
        title: 'Report IELTS / TOEFL Test Score or MOI',
        description: 'Most English-taught programs require IELTS 6.5+ or an official Medium of Instruction (MOI) certificate.',
        priority: 'MEDIUM',
        category: 'Language',
        targetRoute: '/journey/details',
        ctaText: 'Add English Scores',
      });
    }

    // 5. CV Generation Next Step
    nextSteps.push({
      id: 'step-cv',
      title: 'Generate Official German CV (Lebenslauf)',
      description: 'Convert your profile into a DIN 5008-compliant German CV formatted specifically for university and employer reviewers.',
      priority: 'MEDIUM',
      category: 'Application',
      targetRoute: '/journey/cv',
      ctaText: 'Generate German CV',
    });

    // Populate Missing Requirements for compatibility
    for (const factor of factors) {
      if (factor.status === 'MISSING_REQUIREMENT' || factor.status === 'NEEDS_IMPROVEMENT') {
        missingRequirements.push({
          id: `req-${factor.id}`,
          category: factor.category === 'ACADEMIC' ? 'DEGREE' : factor.category === 'GERMAN' ? 'LANGUAGE' : factor.category === 'DOCUMENTS' ? 'DOCUMENT' : 'EXPERIENCE',
          title: factor.factorName,
          description: factor.reason,
          severity: factor.status === 'MISSING_REQUIREMENT' ? 'BLOCKING' : 'RECOMMENDED',
          actionableStep: factor.recommendedAction,
        });
      }
    }

    // Scoring Methodology Object
    const methodology: QualificationScoringMethodology = {
      title: 'Educaro Transparent Qualification Scoring Engine',
      description: 'Our scoring engine evaluates your profile deterministically against official German immigration regulations (§18g AufenthG for EU Blue Card), the Central Office for Foreign Education (ZAB / Anabin database), and KMK admission guidelines. Factor weights are calibrated to reflect real-world university cutoffs and visa approval rates.',
      factorWeights: factors.map((f) => ({
        factorName: f.factorName,
        weightPercentage: f.maxPoints,
        description: `Contributes up to ${f.maxPoints} points (${f.maxPoints}%) to your overall qualification score.`,
      })),
      provisionalNotes: isProvisional
        ? 'Notice: This score is currently provisional because key profile fields (such as official grades, degree status, or verified documents) are incomplete. Completing your profile will refine your verified score.'
        : 'Your score is calculated directly from your saved profile data and uploaded documents.',
      disclaimer: 'Legal Disclaimer: This score represents an informational eligibility assessment based on standard German academic and immigration criteria. It does not constitute a legal guarantee of university admission, employer hiring, or visa issuance by German diplomatic missions.',
    };

    // Deterministic readiness estimate calculation
    const currentLvl = effectiveGermanLevel || CEFRLevel.A1;
    const targetLvl = pathway === Pathway.AUSBILDUNG ? CEFRLevel.B1 : CEFRLevel.B2;

    const germanReadiness: GermanReadinessTrack = {
      currentLevel: currentLvl,
      targetLevel: targetLvl,
      estimatedMonthsToTarget: effectiveGermanLevel === CEFRLevel.B1 ? 2 : effectiveGermanLevel === CEFRLevel.A2 ? 3 : 4,
      readinessHeadline: effectiveGermanLevel === CEFRLevel.B1
        ? 'You are on track! ~2 months to reach solid B2 conversational fluency'
        : 'Guided German Learning Path: ~4 months to reach certified B1 level',
      tutorialModules: [
        {
          id: 'vid-a1',
          title: 'Nicos Weg — German A1 Beginner Course (DW)',
          level: CEFRLevel.A1,
          duration: 'Interactive',
          videoUrl: 'https://learngerman.dw.com/en/nicos-weg/c-36519789',
          description: 'Official Deutsche Welle structured storyline course with vocabulary drills and pronunciation practice.',
        },
        {
          id: 'vid-a2',
          title: 'Nicos Weg — German A2 Elementary Course (DW)',
          level: CEFRLevel.A2,
          duration: 'Interactive',
          videoUrl: 'https://learngerman.dw.com/en/nicos-weg/c-36519797',
          description: 'Practical training for everyday conversations, living, and working in Germany.',
        },
        {
          id: 'vid-b1',
          title: 'Goethe-Zertifikat B1 Exam Preparation',
          level: CEFRLevel.B1,
          duration: 'Interactive',
          videoUrl: 'https://www.goethe.de/en/spr/ueb.html',
          description: 'Official free Goethe-Institut practice exercises and speaking test strategies.',
        },
      ],
    };

    return {
      pathway,
      status,
      scorePct,
      statusTier,
      statusLabel,
      isProvisional,
      factors,
      methodology,
      nextSteps,
      headline,
      summary,
      needsGermanSupport,
      actualGermanLevel: actualGermanLevel || 'Not yet assessed',
      passedCriteria,
      missingRequirements,
      germanReadiness,
      recommendedService: {
        title: 'Educaro Fast-Track APS & Priority Consultant Review',
        description: 'Complete German APS certificate filing with expedited 1-on-1 advisor matching and guaranteed document verification.',
        priceInr: 100,
        entitlementKey: 'PRIORITY_APS_CONSULTANT_REVIEW',
      },
    };
  }

  // Preserved for backward compatibility with existing tests and services
  runRules(
    pathway: Pathway,
    data: {
      degree: string;
      university: string;
      gpaStr: string;
      expStr: string;
      germanLevel?: CEFRLevel;
      hasReportedGerman: boolean;
      hasDegreeDoc: boolean;
      hasLanguageDoc: boolean;
      hasUnresolvedInconsistencies?: boolean;
    }
  ): QualificationEvaluation {
    const uploadedTypes = new Set<string>();
    if (data.hasDegreeDoc) uploadedTypes.add('DEGREE_CERTIFICATE');
    if (data.hasLanguageDoc) uploadedTypes.add('LANGUAGE_CERTIFICATE');

    const fieldMap: Record<string, string> = {
      degree: data.degree,
      institution: data.university,
      gradeOrGpa: data.gpaStr,
      workExperience: data.expStr,
      germanLevel: data.germanLevel || 'NONE',
    };

    const dummyProfile: ComprehensiveApplicantProfile = {
      userId: 'dummy',
      status: 'DRAFT',
      isComplete: false,
      completenessScore: 50,
      lastSavedAt: new Date().toISOString(),
      personal: {
        fullName: 'Applicant',
        email: 'applicant@example.com',
        phone: '',
        nationality: 'Indian',
        countryOfResidence: 'India',
        currentCity: 'Mumbai',
        passportStatus: 'HAVE_PASSPORT',
        preferredLanguage: 'English',
      },
      goals: {
        primaryPathway: pathway,
        preferredFieldOrIndustry: 'Engineering',
        preferredCitiesOrRegions: [],
        expectedTimeline: '2026',
        intendedIntakeYear: '2026',
        readinessStatus: 'READY_TO_APPLY',
      },
      academic: {
        highestCompletedQualification: data.degree || 'Bachelor',
        currentQualificationStatus: 'COMPLETED',
        degreeName: data.degree,
        streamOrSpecialization: '',
        institutionName: data.university,
        countryOfEducation: 'India',
        graduationYear: 2024,
        gradingScale: '10_POINT',
        scoreValue: data.gpaStr || '',
        backlogsCount: 0,
        transcriptsAvailable: data.hasDegreeDoc,
        degreeCertificateAvailable: data.hasDegreeDoc,
      },
      languages: {
        germanLevel: (data.germanLevel as any) || 'NONE',
        germanCertificateAvailable: data.hasLanguageDoc,
        isCurrentlyLearningGerman: false,
        englishLevel: 'FLUENT',
        englishCertificateAvailable: false,
      },
      exams: {
        hasTakenEntranceExams: false,
        exams: [],
      },
      experience: {
        currentEmploymentStatus: 'EMPLOYED',
        totalExperienceYears: parseFloat(data.expStr) || 0,
        jobs: [],
        internships: [],
        projects: [],
        technicalSkills: [],
        certifications: [],
      },
      financial: {
        annualBudgetEUR: 11208,
        tuitionBudgetEUR: 0,
        monthlyLivingCostEUR: 934,
        financialProofMethod: 'BLOCKED_ACCOUNT',
        interestedInScholarships: true,
        interestedInFunding: false,
        scholarshipPreferences: [],
        sensitiveDataConsent: true,
      },
      documents: {
        documents: [],
      },
      previousApps: {
        applicationStage: 'EXPLORING',
        completedRequirements: [],
        outstandingRequirements: [],
        mainChallenges: '',
        assistanceNeeded: [],
      },
      additional: {},
    };

    return this.runTransparentRules({
      pathway,
      profile: dummyProfile,
      fieldMap,
      uploadedTypes,
      hasUnresolvedInconsistencies: Boolean(data.hasUnresolvedInconsistencies),
      effectiveGermanLevel: data.germanLevel,
      actualGermanLevel: data.germanLevel,
    });
  }

  async getLearningPath(userId: string): Promise<GermanLearningPathData> {
    const fieldsRes = await this.db.query(
      'SELECT field_key, value FROM profile_fields WHERE user_id = $1',
      [userId]
    );

    const fieldMap: Record<string, string> = {};
    for (const row of fieldsRes.rows) {
      fieldMap[row.field_key] = row.value;
    }

    const rawPathway = fieldMap['targetPathway'] || 'STUDY';
    const rawGerman = fieldMap['germanLevel'];
    const hasReportedGerman = Boolean(rawGerman && rawGerman !== 'NONE');
    const currentLevelStr = hasReportedGerman ? rawGerman.toUpperCase() : 'Not yet assessed';

    // Target level for chosen pathway
    let targetLevel = 'B1';
    let targetStage = 3; // B1
    if (rawPathway.toUpperCase().includes('AUSBILDUNG')) {
      targetLevel = 'B1';
      targetStage = 3;
    } else if (rawPathway.toUpperCase().includes('STUDY')) {
      targetLevel = 'B1';
      targetStage = 3;
    } else {
      targetLevel = 'B1';
      targetStage = 3;
    }

    // Map current stage
    let currentStage = 0;
    if (currentLevelStr.includes('B2')) currentStage = 4;
    else if (currentLevelStr.includes('B1')) currentStage = 3;
    else if (currentLevelStr.includes('A2')) currentStage = 2;
    else if (currentLevelStr.includes('A1')) currentStage = 1;
    else currentStage = 0;

    const stagesRemaining = Math.max(1, targetStage - currentStage);
    const estimatedWeeks = stagesRemaining * WEEKS_PER_LEVEL;
    const estimatedMonths = Math.ceil(estimatedWeeks / 4);

    const isAtLeastB1 = currentStage >= 3;
    const needsGermanSupport = !hasReportedGerman || !isAtLeastB1;

    const readiness: GermanReadinessCalculation = {
      currentLevel: currentLevelStr,
      targetLevel,
      stagesRemaining,
      weeksPerLevel: WEEKS_PER_LEVEL,
      hoursPerWeek: 10,
      estimatedWeeks,
      estimatedMonths,
      formulaExplanation: `Deterministic calculation: (${targetLevel} Target - ${currentLevelStr} Current = ${stagesRemaining} CEFR stage${stagesRemaining > 1 ? 's' : ''}) × ${WEEKS_PER_LEVEL} weeks/stage = ${estimatedWeeks} weeks (~${estimatedMonths} months) at 10-12 hrs/week study pace.`,
    };

    return {
      needsGermanSupport,
      chosenPathway: rawPathway,
      readiness,
      resources: JSON.parse(fs.readFileSync(path.join(process.cwd(), 'learning-resources.json'), 'utf8')),
    };
  }

  async simulateWhatIf(
    userId: string,
    criteria: WhatIfCriteria,
  ): Promise<SimulationResultPayload> {
    const baseEval = await this.evaluateQualification(userId, undefined, true);
    const targetLvl = criteria.germanLevel ?? CEFRLevel.B1;
    const simEval = await this.evaluateQualification(userId, targetLvl, true);

    const statusChanged = baseEval.status !== simEval.status;
    const reqDelta = baseEval.missingRequirements.length - simEval.missingRequirements.length;
    const scoreDelta = simEval.scorePct - baseEval.scorePct;

    const baseStatusLabel = baseEval.status === QualificationStatus.ELIGIBLE ? 'Fully Qualified' : 'Qualified with conditions';
    const simStatusLabel = simEval.status === QualificationStatus.ELIGIBLE ? 'Fully Qualified' : 'Qualified with conditions';

    let summaryText = `At ${targetLvl}: `;
    if (statusChanged) {
      summaryText += `qualification status changes from '${baseStatusLabel}' to '${simStatusLabel}'; `;
    } else {
      summaryText += `qualification status remains '${simStatusLabel}'; `;
    }

    if (reqDelta > 0) {
      summaryText += `${reqDelta} fewer outstanding requirement${reqDelta > 1 ? 's' : ''} (${targetLvl} language requirement fulfilled).`;
    } else if (reqDelta === 0 && !baseEval.needsGermanSupport) {
      summaryText += `language requirement was already fulfilled.`;
    } else {
      summaryText += `readiness timeline adjusted for ${targetLvl}.`;
    }

    return {
      evaluation: simEval,
      diff: {
        previousStatus: baseEval.status,
        simulatedStatus: simEval.status,
        statusChanged,
        scoreDelta,
        unlockedRequirementsCount: Math.max(0, reqDelta),
        summaryText,
      },
    };
  }
}
