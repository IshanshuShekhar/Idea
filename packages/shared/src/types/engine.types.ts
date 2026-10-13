// ============================================================================
// AI-POWERED GERMANY UNIVERSITY & SCHOLARSHIP RECOMMENDATION ENGINE TYPES
// ============================================================================

export type DegreeLevel = 'BACHELOR' | 'MASTER' | 'PHD' | 'PREPARATORY';
export type TeachingLanguage = 'ENGLISH' | 'GERMAN' | 'BILINGUAL';
export type RequirementRigidity = 'MANDATORY' | 'PREFERRED' | 'OPTIONAL' | 'NOT_REQUIRED' | 'UNKNOWN';
export type ApplicationMethod = 'UNI_ASSIST' | 'DIRECT' | 'HOCHSCHULSTART' | 'OTHER';
export type IntakeType = 'WINTER' | 'SUMMER' | 'BOTH';
export type InstitutionType = 'UNIVERSITAET' | 'TU9' | 'FACHHOCHSCHULE' | 'KUNSTHOCHSCHULE' | 'PRIVATE';
export type UniversityOwnership = 'PUBLIC' | 'PRIVATE';

// University Eligibility Classification (Section 6 - Stage A)
export enum UniversityMatchStatus {
  SATISFIED = 'SATISFIED',                         // 1. Requirements appear satisfied
  POTENTIAL_MATCH = 'POTENTIAL_MATCH',             // 2. Potential match — verification required
  UNMET_REQUIREMENTS = 'UNMET_REQUIREMENTS',       // 3. Additional requirements not yet satisfied
  UNSUITABLE = 'UNSUITABLE',                       // 4. Currently unsuitable
  INSUFFICIENT_INFO = 'INSUFFICIENT_INFO',         // 5. Insufficient information
}

// Scholarship Eligibility Classification (Section 7)
export enum ScholarshipEligibilityStatus {
  LIKELY_ELIGIBLE = 'LIKELY_ELIGIBLE',             // 1. Likely eligible based on provided information
  POTENTIALLY_ELIGIBLE = 'POTENTIALLY_ELIGIBLE',   // 2. Potentially eligible — additional verification required
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',                   // 3. Not currently eligible
  MISSING_INFO = 'MISSING_INFO',                   // 4. Missing information
  DEADLINE_PASSED = 'DEADLINE_PASSED',             // 5. Application deadline passed
  RECHECK_REQUIRED = 'RECHECK_REQUIRED',           // 6. Information requires rechecking
}

export type ScholarshipFundingType =
  | 'MONTHLY_STIPEND'
  | 'ONE_TIME'
  | 'SEMESTER_AWARD'
  | 'ANNUAL_AWARD'
  | 'TUITION_WAIVER'
  | 'REIMBURSEMENT'
  | 'DISABILITY_EXPENSES';

export type ProviderType = 'GOVERNMENT' | 'FOUNDATION' | 'UNIVERSITY' | 'CORPORATE' | 'PRIVATE';

// ----------------------------------------------------------------------------
// APPLICANT PROFILE WIZARD DATA (Section 3)
// ----------------------------------------------------------------------------

export interface Step1PersonalData {
  fullName: string;
  email: string;
  nationality: string;
  residenceCountry: string;
  currentEducationLevel: string;
  currentUniversity: string;
  currentDegree: string;
  graduationYear: number;
  intendedIntake: string; // e.g. "Winter 2026/27", "Summer 2027"
  intendedStudyLevel: DegreeLevel;
  intendedSubject: string; // e.g. "Computer Science", "AI / Data Science", "Mechanical Engineering"
  preferredStudyLanguage: TeachingLanguage;
}

export interface Step2AcademicData {
  cgpaOrPercentage: number;
  gradingScale: '10_POINT' | '4_POINT' | 'PERCENTAGE' | 'GERMAN_SCALE' | 'OTHER';
  maxGradeOnScale?: number;
  minPassingGradeOnScale?: number;
  estimatedGermanGrade?: number; // Calculated using Bavarian formula
  previousQualifications?: string;
  degreeSubjectSpecialisation: string;
  relevantSubjectsCompleted: string[];
  mathProgrammingBackground: {
    hasHigherMath: boolean;
    mathCreditsECTS?: number;
    hasProgramming: boolean;
    programmingLanguages?: string[];
    csCreditsECTS?: number;
  };
  totalCreditsECTS?: number;
  backlogsCount: number;
  researchExperience?: string;
  academicAwards?: string[];
}

export interface Step3LanguageData {
  germanProficiency: 'NONE' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  germanExamProvider?: 'GOETHE' | 'TESTDAF' | 'DSH' | 'TELC' | 'NONE' | 'IN_PROGRESS';
  testDafScores?: {
    reading?: number;
    listening?: number;
    writing?: number;
    speaking?: number;
  };
  dshLevel?: 'DSH_1' | 'DSH_2' | 'DSH_3';
  goetheResult?: string;
  englishProficiency: 'NATIVE' | 'ADVANCED' | 'INTERMEDIATE' | 'BASIC' | 'NONE';
  englishExamProvider?: 'IELTS' | 'TOEFL' | 'PTE' | 'DUOLINGO' | 'MOI_LETTER' | 'NONE';
  englishScore?: number;
  englishSectionScores?: {
    reading?: number;
    listening?: number;
    writing?: number;
    speaking?: number;
  };
  testDate?: string;
  validUntil?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  category: 'AI_ML' | 'SOFTWARE' | 'ENGINEERING' | 'RESEARCH' | 'OTHER';
  description: string;
  technologies: string[];
  githubUrl?: string;
}

export interface InternshipItem {
  id: string;
  role: string;
  organization: string;
  durationMonths: number;
  description: string;
}

export interface ResearchPublicationItem {
  id: string;
  title: string;
  venue: string;
  year: number;
  doiOrUrl?: string;
}

export interface CompetitionItem {
  id: string;
  name: string;
  achievement: string;
  year: number;
}

export interface SportsAchievement {
  sportName: string;
  competitionLevel: 'RECREATIONAL' | 'COLLEGE' | 'STATE' | 'NATIONAL' | 'INTERNATIONAL';
  achievements: string;
  certifications?: string;
  isOfficialCompetitor: boolean;
}

export interface Step4ProjectsData {
  projects: ProjectItem[];
  internships: InternshipItem[];
  publications: ResearchPublicationItem[];
  competitions: CompetitionItem[];
  sports: SportsAchievement[];
  volunteering: {
    organization: string;
    role: string;
    durationMonths: number;
    description: string;
  }[];
  leadershipRoles: string[];
}

export interface Step5BudgetData {
  annualBudgetEUR: number;
  needsFullFunding: boolean;
  partialScholarshipAcceptable: boolean;
  maxAffordableMonthlyLivingEUR: number;
  preferredStates: string[];
  preferredCities: string[];
  publicOrPrivatePreference: 'PUBLIC_ONLY' | 'PRIVATE_ACCEPTABLE' | 'NO_PREFERENCE';
  maxTuitionBudgetEUR: number;
  preferredDurationSemesters?: number;
  willingnessToStudyInGerman: boolean;
  targetTimelineMonths: number;
}

export interface Step6SensitiveScholarshipData {
  exploreAcademicMerit: boolean;
  exploreFinancialNeed: boolean;
  financialNeedBracket?: 'LOW_INCOME' | 'LOWER_MIDDLE' | 'MIDDLE' | 'NOT_SPECIFIED';
  hasIncomeCertificate?: boolean;
  exploreSportsScholarships: boolean;
  exploreWomenInStem: boolean;
  isEligibleForWomenInStem?: boolean;
  exploreDisabilitySupport: boolean;
  disabilitySupportNeeds?: {
    needsAccessibilityAccommodation: boolean;
    needsAdditionalExpenseAssistance: boolean;
    exploringSpecificFunding: boolean;
  };
  exploreRefugeeHumanitarian: boolean;
  exploreFirstGeneration: boolean;
  isFirstGenerationStudent?: boolean;
  exploreSocialCommunity: boolean;
  exploreResearchInnovation: boolean;
  consentGivenAt: string;
  consentWithdrawnAt?: string;
}

export interface FullApplicantProfile {
  userId: string;
  step1: Step1PersonalData;
  step2: Step2AcademicData;
  step3: Step3LanguageData;
  step4: Step4ProjectsData;
  step5: Step5BudgetData;
  step6?: Step6SensitiveScholarshipData;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// DATABASE MODELS: UNIVERSITIES & PROGRAMMES (Section 4)
// ----------------------------------------------------------------------------

export interface UniversityRecord {
  id: string;
  name: string;
  officialWebsite: string;
  city: string;
  federalState: string;
  institutionType: InstitutionType;
  publicOrPrivate: UniversityOwnership;
  internationalAdmissionsUrl: string;
  tuitionFeeInformation: string;
  semesterContributionEUR: number;
  generalContactUrl: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  campusSetting?: string;
  livingCostEstimateMonthlyEUR: number;
}

export interface ProgrammeRecord {
  id: string;
  universityId: string;
  programmeName: string;
  degreeLevel: DegreeLevel;
  subjectArea: string;
  specialisation: string;
  teachingLanguage: TeachingLanguage;
  acceptedLanguageCertificates: string[];
  minimumLanguageScores: {
    germanLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    testDafMinPerSection?: number;
    dshMin?: number;
    ieltsMinOverall?: number;
    toeflMinOverall?: number;
    duolingoMin?: number;
  };
  minimumAcademicGradeGerman: number; // e.g. 2.5 (lower is better in German system)
  requiredPreviousDegree: string;
  requiredSubjects: string[];
  requiredCreditCategories: {
    mathCreditsECTS?: number;
    computerScienceECTS?: number;
    engineeringECTS?: number;
    totalECTS?: number;
  };
  greRequirement: RequirementRigidity;
  otherEntranceTests?: string;
  applicationMethod: ApplicationMethod;
  applicationOpenDateWinter?: string;
  applicationDeadlineWinter: string; // ISO date e.g. "2026-07-15"
  applicationOpenDateSummer?: string;
  applicationDeadlineSummer?: string; // ISO date e.g. "2026-01-15"
  intake: IntakeType;
  tuitionFeeEUR: number; // 0 for most public universities
  semesterContributionEUR: number;
  estimatedDurationSemesters: number;
  officialProgrammeUrl: string;
  officialAdmissionRequirementsUrl: string;
  dataSource: string;
  lastVerifiedAt: string;
  // University joined fields for fast display
  universityName?: string;
  city?: string;
  federalState?: string;
  institutionType?: InstitutionType;
  publicOrPrivate?: UniversityOwnership;
  livingCostEstimateMonthlyEUR?: number;
}

// ----------------------------------------------------------------------------
// DATABASE MODELS: SCHOLARSHIPS & RULES (Section 5)
// ----------------------------------------------------------------------------

export interface ScholarshipRecord {
  id: string;
  scholarshipName: string;
  providerName: string;
  providerType: ProviderType;
  associatedUniversityId?: string | null;
  fundingType: ScholarshipFundingType;
  fundingAmount: number;
  currency: string;
  paymentFrequency: string; // 'MONTHLY', 'ONE_TIME', 'PER_SEMESTER', 'ANNUAL'
  durationMonths: number;
  tuitionCoverage: boolean;
  livingCostCoverage: boolean;
  insuranceCoverage: boolean;
  travelAllowance: boolean;
  nationalityEligibility: string[]; // ['INDIA', 'ALL_INTERNATIONAL', 'DEVELOPING_COUNTRIES']
  eligibleDegreeLevels: DegreeLevel[];
  eligibleSubjects: string[]; // ['ALL', 'STEM', 'COMPUTER_SCIENCE', ...]
  minimumAcademicGradeGerman?: number; // e.g. 2.0 or better
  financialNeedRequirement: boolean;
  sportsAchievementRequirement: boolean;
  genderRelatedEligibility: string; // 'NONE' | 'WOMEN_ONLY' | 'ALL'
  disabilityRelatedEligibility: string; // 'NONE' | 'DISABILITY_SPECIFIC' | 'INCLUSIVE'
  otherEligibilityConditions?: string;
  requiredDocuments: string[];
  applicationMethod: string;
  applicationDeadline: string; // ISO Date e.g. "2026-10-31"
  officialApplicationUrl: string;
  officialEligibilityUrl: string;
  sourceUrl: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  lastVerifiedAt: string;
  isExpired?: boolean;
}

export interface ScholarshipRuleRecord {
  id: string;
  scholarshipId: string;
  ruleType:
    | 'NATIONALITY'
    | 'DEGREE_LEVEL'
    | 'ACADEMIC_PERFORMANCE'
    | 'FINANCIAL_NEED'
    | 'SPORTS_ACHIEVEMENT'
    | 'GENDER'
    | 'DISABILITY'
    | 'SUBJECT_AREA'
    | 'SOCIAL_ENGAGEMENT'
    | 'DEADLINE';
  ruleDescription: string;
  conditionType: 'EQUALS' | 'IN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN_OR_EQUAL' | 'BOOLEAN';
  conditionValue: string; // JSON encoded or string value
  mandatoryOrPreferred: 'MANDATORY' | 'PREFERRED';
  evidenceRequired: string;
  exceptionNotes?: string;
  officialSourceUrl: string;
  lastVerifiedAt: string;
}

// ----------------------------------------------------------------------------
// RECOMMENDATION ENGINE RESULTS (Sections 6 & 7)
// ----------------------------------------------------------------------------

export interface UniversityMatchResult {
  programme: ProgrammeRecord;
  admissionStatus: UniversityMatchStatus;
  matchScore: number; // 0-100 explainable score
  scoreBreakdown: {
    academicCompatibility: number; // 0-30
    subjectRelevance: number;       // 0-25
    languageReadiness: number;      // 0-20
    budgetCompatibility: number;    // 0-15
    locationAndPreferences: number; // 0-10
  };
  matchedCriteria: string[];
  missingRequirements: string[];
  unverifiedDetails: string[];
  recommendedNextAction: string;
  estimatedCosts: {
    tuitionFeeEUR: number;
    semesterContributionEUR: number;
    monthlyLivingEstimateEUR: number;
    annualTotalEstimateEUR: number;
    isEstimateOnly: true;
  };
  isSaved?: boolean;
}

export interface ScholarshipMatchResult {
  scholarship: ScholarshipRecord;
  eligibilityStatus: ScholarshipEligibilityStatus;
  matchScore: number; // 0-100
  conditionsMet: string[];
  missingConditions: string[];
  evidenceNeeded: string[];
  whyAmISeeingThis: string; // Plain English grounded explanation
  isSaved?: boolean;
}

export interface RecommendationEngineResponse {
  applicantSummary: {
    fullName: string;
    intendedDegree: DegreeLevel;
    intendedSubject: string;
    convertedGermanGrade?: number;
    germanLevel: string;
    englishScore?: string;
  };
  universityMatches: UniversityMatchResult[];
  scholarshipMatches: ScholarshipMatchResult[];
  activeWeights: {
    academic: number;
    subject: number;
    language: number;
    budget: number;
    preferences: number;
  };
  generatedAt: string;
}

// ----------------------------------------------------------------------------
// ROADMAP & SHORTLISTS (Sections 9, 11)
// ----------------------------------------------------------------------------

export type RoadmapCategory =
  | 'PROFILE'
  | 'QUALIFICATION'
  | 'PATHWAY'
  | 'LANGUAGE'
  | 'APS_VERIFICATION'
  | 'DOCUMENTS'
  | 'SCHOLARSHIP'
  | 'APPLICATION'
  | 'OFFERS'
  | 'FINANCE_VISA'
  | 'TRAVEL'
  | 'SETTLEMENT';

export interface RoadmapStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  category: RoadmapCategory;
  isMandatory: boolean;
  isCompleted: boolean;
  dueDate?: string;
  actionUrl?: string;
  conditionalReason?: string;
}

export interface SavedShortlistItem {
  id: string;
  userId: string;
  itemType: 'PROGRAMME' | 'SCHOLARSHIP';
  itemId: string;
  itemTitle: string;
  subtitle: string;
  deadline?: string;
  notes?: string;
  savedAt: string;
}
