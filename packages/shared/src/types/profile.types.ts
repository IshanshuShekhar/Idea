import { Provenance, AIAllowedProvenance } from '../enums/provenance.enum';
import { Pathway } from '../enums/pathway.enum';
import { CEFRLevel } from '../enums/cefr.enum';

/**
 * Hard Rule 1: Every profile field carries a provenance label.
 */
export interface ProvenanceField<T> {
  value: T;
  provenance: Provenance;
  confidence?: number;
  sourceDocumentId?: string;
  sourceSnippet?: string;
  updatedAt: string;
}

/**
 * Payload used when AI updates a field: strictly disallows Provenance.VERIFIED
 */
export interface AIAttributeUpdate<T> {
  value: T;
  provenance: AIAllowedProvenance;
  confidence?: number;
  sourceDocumentId?: string;
  sourceSnippet?: string;
}

export interface EducationEntry {
  id: string;
  institution: ProvenanceField<string>;
  degree: ProvenanceField<string>;
  field: ProvenanceField<string>;
  graduationDate: ProvenanceField<string>;
  gradeOrGpa?: ProvenanceField<string>;
}

export interface EmploymentEntry {
  id: string;
  employer: ProvenanceField<string>;
  role: ProvenanceField<string>;
  responsibilities: ProvenanceField<string>;
  startDate: ProvenanceField<string>;
  endDate?: ProvenanceField<string>;
  isCurrent?: ProvenanceField<boolean>;
}

export interface LanguageSkill {
  id: string;
  language: ProvenanceField<string>;
  level: ProvenanceField<CEFRLevel>;
  certificate?: ProvenanceField<string>;
  score?: ProvenanceField<string>;
}

export interface ApplicantProfile {
  id: string;
  userId: string;
  name: ProvenanceField<string>;
  email: ProvenanceField<string>;
  phone?: ProvenanceField<string>;
  location?: ProvenanceField<string>;
  targetPathway: ProvenanceField<Pathway>;
  education: EducationEntry[];
  employment: EmploymentEntry[];
  languages: LanguageSkill[];
  skills: ProvenanceField<string[]>;
  completenessScore: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
}

export interface ProfileFieldRecord {
  id: string;
  userId: string;
  category: string;
  fieldKey: string;
  value: string;
  provenance: Provenance;
  confidence?: number | null;
  sourceDocumentId?: string | null;
  sourceSnippet?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface UpsertFieldDto {
  category: string;
  fieldKey: string;
  value: string;
  provenance?: Provenance;
  confidence?: number;
  sourceDocumentId?: string;
  sourceSnippet?: string;
}

// --------------------------------------------------------------------------
// COMPREHENSIVE APPLICANT PROFILE (SECTIONS A - M)
// --------------------------------------------------------------------------

export interface SectionAPersonalInfo {
  fullName: string;
  dateOfBirth?: string;
  email: string;
  phone: string;
  phoneCountryCode?: string;
  nationality: string;
  countryOfResidence: string;
  currentCity: string;
  currentAddress?: string;
  passportStatus: 'HAVE_PASSPORT' | 'APPLIED' | 'NO_PASSPORT';
  passportNumber?: string;
  passportExpiryDate?: string;
  preferredLanguage: string;
  gender?: 'WOMAN' | 'MAN' | 'NON_BINARY' | 'SELF_DESCRIBE' | 'PREFER_NOT_TO_SAY';
  genderSelfDescribe?: string;
}

export interface SectionBGoals {
  primaryPathway: Pathway;
  secondaryPathway?: string;
  specificDegreeLevel?: string;
  preferredFieldOrIndustry: string;
  preferredCitiesOrRegions: string[];
  expectedTimeline: string;
  intendedIntakeYear: string;
  readinessStatus: 'EXPLORING' | 'PREPARING' | 'READY_TO_APPLY';
}

export interface SectionCAcademicBackground {
  highestCompletedQualification: string;
  currentQualificationStatus: 'STUDYING' | 'COMPLETED' | 'ON_HOLD';
  currentQualificationName?: string;
  degreeName: string;
  streamOrSpecialization: string;
  institutionName: string;
  countryOfEducation: string;
  graduationYear: number | string;
  gradingScale: '10_POINT' | 'PERCENTAGE' | '4_POINT' | 'GERMAN_SCALE' | 'OTHER';
  scoreValue: number | string;
  maxGrade?: number;
  minPassingGrade?: number;
  estimatedGermanGrade?: number;
  backlogsCount: number;
  transcriptsAvailable: boolean;
  degreeCertificateAvailable: boolean;
  previousEducationHistory?: string;
  academicAchievements?: string;

  // Master's applicant follow-up
  bachelorSubjects?: string[];
  bachelorTotalCreditsECTS?: number;
  bachelorMathCreditsECTS?: number;
  bachelorCsCreditsECTS?: number;
  hasHigherMath?: boolean;
  hasProgramming?: boolean;
  programmingLanguages?: string[];

  // Bachelor's applicant follow-up
  school12thBoard?: string;
  school12thPercentage?: number | string;
  schoolStream?: string;
  entranceExamResults?: string;

  // Ausbildung applicant follow-up
  vocationalQualifications?: string;
  practicalTrainingExperience?: string;
}

export interface SectionDLanguages {
  germanLevel: 'NONE' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  germanCertificateAvailable: boolean;
  germanExamType?: 'GOETHE' | 'TESTDAF' | 'TELC' | 'OSD' | 'OTHER' | 'NONE';
  germanScore?: string;
  germanExamDate?: string;
  isCurrentlyLearningGerman: boolean;
  targetGermanLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  expectedGermanExamDate?: string;

  englishLevel: 'BASIC' | 'INTERMEDIATE' | 'FLUENT' | 'NATIVE';
  englishExamType?: 'IELTS' | 'TOEFL' | 'PTE' | 'DUOLINGO' | 'MOI' | 'NONE';
  englishScore?: number | string;
  englishExamDate?: string;
  englishCertificateAvailable: boolean;
}

export interface EntranceExamItem {
  id: string;
  testName: string;
  status: 'TAKEN' | 'REGISTERED' | 'PLANNED' | 'NOT_APPLICABLE';
  score?: string;
  examDate?: string;
  plannedDate?: string;
  certificateAvailable?: boolean;
}

export interface SectionEExams {
  hasTakenEntranceExams: boolean;
  exams: EntranceExamItem[];
}

export interface WorkExperienceItem {
  id: string;
  jobTitle: string;
  employerName: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'INTERNSHIP' | 'FREELANCE';
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  responsibilities: string;
}

export interface ProfileInternshipItem {
  id: string;
  role: string;
  organization: string;
  durationMonths: number;
  description: string;
}

export interface ProfileProjectItem {
  id: string;
  title: string;
  category?: string;
  technologies: string[];
  description: string;
  url?: string;
}

export interface SectionFWorkExperience {
  currentEmploymentStatus: 'EMPLOYED' | 'UNEMPLOYED' | 'STUDENT' | 'FREELANCER';
  totalExperienceYears: number | string;
  jobs: WorkExperienceItem[];
  internships: ProfileInternshipItem[];
  projects: ProfileProjectItem[];
  technicalSkills: string[];
  certifications: string[];
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  resumeFileName?: string;
  keyAchievements?: string;
}

export interface SectionGStudyPreferences {
  preferredDegreeLevel: 'BACHELOR' | 'MASTER' | 'PHD';
  preferredSubject: string;
  preferredInstitutions: string[];
  preferredStates: string[];
  preferredCities: string[];
  institutionPreference: 'PUBLIC_ONLY' | 'PRIVATE_ACCEPTED' | 'EITHER';
  teachingLanguagePreference: 'ENGLISH' | 'GERMAN' | 'BILINGUAL';
  studyMode: 'FULL_TIME' | 'PART_TIME' | 'HYBRID' | 'ONLINE';
  desiredStartSemester: string;
  maxTuitionBudgetEUR: number;
  monthlyLivingBudgetEUR: number;
  academicEligibilityNotes?: string;
  previousApplications?: string;
  preferredCourseDurationSemesters?: number;
}

export interface SectionHAusbildungPreferences {
  preferredOccupation: string;
  preferredIndustry: string;
  relevantSchoolQualifications: string;
  practicalExperience: string;
  preferredLocations: string[];
  desiredStartDate: string;
  expectedStipendEUR?: number;
  vocationalCertifications?: string;
  existingOffers?: string;
  vocationalInterests?: string;
}

export interface SectionIEmploymentPreferences {
  targetJobTitle: string;
  targetIndustry: string;
  relevantQualifications?: string;
  experienceSummary?: string;
  preferredLocations: string[];
  expectedSalaryEUR?: number | string;
  noticePeriodDays?: number | string;
  employmentType: 'PERMANENT' | 'CONTRACT' | 'ANY';
  workAuthorizationStatus: string;
  existingJobOffers?: string;
}

export interface SectionDisabilityAccessibility {
  wantsToDisclose?: boolean;
  hasPhysicalDisability?: boolean;
  hasVisualImpairment?: boolean;
  hasHearingImpairment?: boolean;
  hasLearningOrNeurodevelopmental?: boolean;
  hasOtherDisability?: boolean;
  otherDisabilityDescription?: string;
  accommodationsRequired?: string;
  preferNotToDisclose?: boolean;
  sensitiveDataConsent?: boolean;
}

export interface SportsAchievementEntry {
  id: string;
  sportName: string;
  isTeamSport: boolean; // individual or team
  competitionLevel: 'RECREATIONAL' | 'SCHOOL' | 'COLLEGE' | 'UNIVERSITY' | 'STATE' | 'NATIONAL' | 'INTERNATIONAL';
  yearsOfParticipation?: number | string;
  competitionName?: string;
  awardsOrMedals?: string;
  achievementDate?: string;
  representedEntity?: string;
  certificateUrl?: string;
  certificateFileName?: string;
  notes?: string;
}

export interface OtherAchievementEntry {
  id: string;
  category:
    | 'ACADEMIC_AWARD'
    | 'OLYMPIAD_COMPETITION'
    | 'RESEARCH'
    | 'LEADERSHIP'
    | 'EXTRACURRICULAR'
    | 'VOLUNTEERING'
    | 'ARTS_CULTURAL'
    | 'PROFESSIONAL_CERTIFICATION'
    | 'OTHER';
  title: string;
  issuerOrOrganization?: string;
  achievementDate?: string;
  description?: string;
  certificateUrl?: string;
  certificateFileName?: string;
}

export interface SectionJFinancialScholarships {
  annualBudgetEUR: number;
  tuitionBudgetEUR: number;
  monthlyLivingCostEUR: number;
  financialProofMethod: 'BLOCKED_ACCOUNT' | 'EDUCATION_LOAN' | 'FAMILY_SPONSOR' | 'SCHOLARSHIP' | 'UNDECIDED';
  interestedInScholarships: boolean;
  interestedInFunding: boolean;
  scholarshipPreferences: string[];
  fundingNeedLevel?: 'FULL' | 'PARTIAL' | 'NOT_NEEDED';
  interestedInTuitionWaiver?: boolean;
  interestedInLivingStipend?: boolean;
  interestedInTravelRelocationGrants?: boolean;
  financialNeedBracket?: 'LOW_INCOME' | 'LOWER_MIDDLE' | 'MODERATE' | 'NOT_APPLICABLE' | 'PREFER_NOT_TO_SAY';
  financialAssistancePreferences?: string;
  sportsAchievements?: string;
  extracurricularOrVolunteering?: string;
  academicMeritHighlights?: string;
  // Sensitive personal fields (strictly voluntary and justified)
  isFirstGenerationStudent?: boolean;
  needsDisabilityAccommodation?: boolean;
  disabilitySupportNotes?: string;
  sensitiveDataConsent: boolean;
}

export interface ProfileDocumentItem {
  id: string;
  documentType: string;
  title: string;
  isMandatory: boolean;
  uploadStatus: 'UPLOADED' | 'MISSING' | 'NOT_APPLICABLE';
  filename?: string;
  filePath?: string;
  uploadDate?: string;
  verificationStatus?: 'VERIFIED' | 'EXTRACTED' | 'PENDING' | 'INVALID';
  expiryDate?: string;
}

export interface SectionKDocuments {
  documents: ProfileDocumentItem[];
}

export interface SectionLPreviousApplications {
  contactedInstitutions?: string;
  appliedPrograms?: string;
  existingOffers?: string;
  previousRejections?: string;
  applicationStage: 'EXPLORING' | 'PREPARING_DOCUMENTS' | 'APPLICATIONS_SUBMITTED' | 'OFFER_RECEIVED' | 'VISA_APPLICATION';
  completedRequirements: string[];
  outstandingRequirements: string[];
  mainChallenges: string;
  assistanceNeeded: string[];
}

export interface SectionMAdditionalInfo {
  additionalPreferences?: string;
  specialRequirements?: string;
  constraints?: string;
  additionalNotes?: string;
}

export interface ComprehensiveApplicantProfile {
  id?: string;
  userId: string;
  status: 'DRAFT' | 'COMPLETED';
  isComplete: boolean;
  completenessScore: number;
  lastSavedAt: string;

  personal: SectionAPersonalInfo;
  goals: SectionBGoals;
  academic: SectionCAcademicBackground;
  languages: SectionDLanguages;
  exams: SectionEExams;
  experience: SectionFWorkExperience;
  studyPrefs?: SectionGStudyPreferences;
  ausbildungPrefs?: SectionHAusbildungPreferences;
  employmentPrefs?: SectionIEmploymentPreferences;
  financial: SectionJFinancialScholarships;
  documents: SectionKDocuments;
  previousApps: SectionLPreviousApplications;
  additional: SectionMAdditionalInfo;

  accessibility?: SectionDisabilityAccessibility;
  sports?: SportsAchievementEntry[];
  otherAchievements?: OtherAchievementEntry[];
}

export interface SectionStatusInfo {
  sectionKey: string;
  title: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'EMPTY';
  completionPct: number;
  missingMandatoryCount: number;
  missingMandatoryFields: string[];
  missingOptionalFields: string[];
}

export interface ProfileCompletionReport {
  overallCompletenessPct: number;
  isReadyForSubmission: boolean;
  primaryPathway: Pathway;
  sections: SectionStatusInfo[];
  allMissingMandatory: { section: string; field: string; label: string }[];
  allMissingOptional: { section: string; field: string; label: string }[];
  documentsRequiredCount: number;
  documentsUploadedCount: number;
  missingMandatoryDocuments: string[];
  suggestedNextSteps: {
    title: string;
    description: string;
    targetSection: string;
    ctaLabel: string;
  }[];
}
