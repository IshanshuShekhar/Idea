export type WorkflowStepId =
  | 'home'
  | 'profile'
  | 'documents'
  | 'qualification'
  | 'recommendations'
  | 'scholarships'
  | 'finance-simulator'
  | 'roadmap'
  | 'exam-prep'
  | 'culture';

export type WorkflowSectionGroup = 'JOURNEY' | 'RESOURCES';

export interface WorkflowStep {
  id: WorkflowStepId;
  order: number; // 1 to 10
  title: string;
  shortTitle: string;
  subtitle: string;
  path: string;
  alternatePaths?: string[];
  primaryCtaLabel: string;
  primaryCtaDestination: string;
  backRoute?: string;
  isMandatory: boolean;
  group?: WorkflowSectionGroup;
  description: string;
}

export interface WorkflowProgressSummary {
  totalSteps: number;
  completedCount: number;
  progressPct: number;
  completedStepIds: WorkflowStepId[];
  nextIncompleteStep: WorkflowStep;
}
