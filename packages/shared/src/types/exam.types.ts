export type ExamCategory = 'GRE' | 'GMAT' | 'TESTAS' | 'IELTS' | 'GERMAN';

export type ExamResourceType =
  | 'SAMPLE_PAPERS'
  | 'STUDY_GUIDE'
  | 'PRACTICE_QUESTIONS'
  | 'PLAYLIST';

export type ExamAccessStatus = 'FREE' | 'PAID' | 'FREEMIUM';

export type ExamLanguage = 'ENGLISH' | 'GERMAN' | 'BILINGUAL';

export interface ExamResource {
  id: string;
  exam: ExamCategory;
  title: string;
  provider: string;
  resourceType: ExamResourceType;
  accessStatus: ExamAccessStatus;
  language: ExamLanguage;
  url: string;
  description: string;
  sectionOrLevel?: string; // e.g. "Quantitative / Verbal / AWA", "B1 / B2", "Core Test"
  isOfficial: boolean;
  recommendedFor?: string;
  playlistChannel?: string;
}

export interface ExamInfo {
  category: ExamCategory;
  name: string;
  fullName: string;
  description: string;
  whoNeedsIt: string;
  germanyApplicability: string;
  isUniversallyRequired: boolean;
  scoringFormat: string;
  officialPortalUrl: string;
}
