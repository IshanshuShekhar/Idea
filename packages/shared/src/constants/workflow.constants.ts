import { WorkflowStep, WorkflowStepId } from '../types/workflow.types';

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'home',
    order: 1,
    title: 'Home',
    shortTitle: 'Home',
    subtitle: 'Deterministic applicant platform for higher education, vocational training, and employment in Germany.',
    path: '/',
    primaryCtaLabel: 'Start My Journey',
    primaryCtaDestination: '/journey/details',
    isMandatory: false,
    description: 'Platform overview and applicant journey launchpad.',
  },
  {
    id: 'profile',
    order: 2,
    title: 'Applicant Profile',
    shortTitle: 'Profile',
    subtitle: 'Comprehensive applicant profile covering academic credentials, language proficiencies, and career pathways.',
    path: '/journey/details',
    alternatePaths: ['/candidate-details', '/profile'],
    primaryCtaLabel: 'Continue to Documents',
    primaryCtaDestination: '/journey/documents',
    backRoute: '/',
    isMandatory: true,
    group: 'JOURNEY',
    description: 'Single source of truth for personal, academic, language, and target pathway details.',
  },
  {
    id: 'documents',
    order: 3,
    title: 'Document Preparation',
    shortTitle: 'Documents',
    subtitle: 'Upload, verify AI extraction, and track APS India verification readiness.',
    path: '/journey/documents',
    primaryCtaLabel: 'Continue to Qualification',
    primaryCtaDestination: '/journey/qualification',
    backRoute: '/journey/details',
    isMandatory: true,
    group: 'JOURNEY',
    description: 'AI-assisted credential verification and official APS India preparation checklist.',
  },
  {
    id: 'qualification',
    order: 4,
    title: 'Qualification Assessment',
    shortTitle: 'Qualification',
    subtitle: 'Deterministic eligibility calculation based on Bavarian formula and German visa prerequisites.',
    path: '/journey/qualification',
    primaryCtaLabel: 'Continue to Recommendations',
    primaryCtaDestination: '/journey/recommendations',
    backRoute: '/journey/documents',
    isMandatory: true,
    group: 'JOURNEY',
    description: 'Transparent readiness scoring, breakdown criteria, and actionable priority next steps.',
  },
  {
    id: 'recommendations',
    order: 5,
    title: 'Recommendations',
    shortTitle: 'Recommendations',
    subtitle: 'Tailored state university programs, dual vocational training, and employment opportunities in Germany.',
    path: '/journey/recommendations',
    alternatePaths: ['/engine/dashboard'],
    primaryCtaLabel: 'Continue to Scholarships',
    primaryCtaDestination: '/journey/scholarships',
    backRoute: '/journey/qualification',
    isMandatory: true,
    group: 'JOURNEY',
    description: 'Algorithmic matching across DAAD programs with customizable criteria weighting.',
  },
  {
    id: 'scholarships',
    order: 6,
    title: 'Scholarship Matching',
    shortTitle: 'Scholarships',
    subtitle: 'Targeted funding, stipends, tuition waivers, and athletic sponsorship opportunities.',
    path: '/journey/scholarships',
    primaryCtaLabel: 'Continue to Finance Simulator',
    primaryCtaDestination: '/journey/financial-simulator',
    backRoute: '/journey/recommendations',
    isMandatory: true,
    group: 'JOURNEY',
    description: 'Curated DAAD, Deutschlandstipendium, foundation grants, and university financial aid.',
  },
  {
    id: 'finance-simulator',
    order: 7,
    title: 'Financial Reality Simulator',
    shortTitle: 'Finance Simulator',
    subtitle: 'Unified German relocation cost calculator, city cost comparison, and monthly living budgets.',
    path: '/journey/financial-simulator',
    alternatePaths: ['/financial-simulator'],
    primaryCtaLabel: 'Continue to Roadmap',
    primaryCtaDestination: '/journey/roadmap',
    backRoute: '/journey/scholarships',
    isMandatory: true,
    group: 'JOURNEY',
    description: 'Statutory blocked account (§ 16b AufenthG), relocation expenses, and realistic monthly living budgets.',
  },
  {
    id: 'roadmap',
    order: 8,
    title: 'Application Roadmap',
    shortTitle: 'Roadmap',
    subtitle: 'Chronological timeline, milestone checkpoints, and actionable deadlines for your Germany journey.',
    path: '/journey/roadmap',
    alternatePaths: ['/roadmap'],
    primaryCtaLabel: 'Explore Exam Prep',
    primaryCtaDestination: '/journey/exam-prep',
    backRoute: '/journey/financial-simulator',
    isMandatory: true,
    group: 'JOURNEY',
    description: 'Step-by-step milestone execution from APS submission to visa dispatch and university enrollment.',
  },
  {
    id: 'exam-prep',
    order: 9,
    title: 'Exam Preparation Hub',
    shortTitle: 'Exam Prep',
    subtitle: 'Curated past questions, preparation guides, and video playlists for TestDaF, Goethe, IELTS, GRE, and TestAS.',
    path: '/journey/exam-prep',
    alternatePaths: ['/exam-prep'],
    primaryCtaLabel: 'Explore Culture & Life',
    primaryCtaDestination: '/journey/culture',
    backRoute: '/journey/roadmap',
    isMandatory: false,
    group: 'RESOURCES',
    description: 'Study resources and official links tailored to chosen programs.',
  },
  {
    id: 'culture',
    order: 10,
    title: 'Culture & Everyday Life',
    shortTitle: 'Culture & Life',
    subtitle: 'Practical guide to everyday German habits, etiquette, manners, useful phrases, and cultural nuances.',
    path: '/journey/culture',
    alternatePaths: ['/culture'],
    primaryCtaLabel: 'Return to My Journey',
    primaryCtaDestination: '/journey/roadmap',
    backRoute: '/journey/exam-prep',
    isMandatory: false,
    group: 'RESOURCES',
    description: 'Nuanced pre-departure orientation, interactive situational quiz, and essential vocabulary library.',
  },
];

export function getWorkflowStepById(id: WorkflowStepId): WorkflowStep | undefined {
  return WORKFLOW_STEPS.find((s) => s.id === id);
}

export function getWorkflowStepByPath(path: string): WorkflowStep | undefined {
  const cleanPath = path.split('?')[0].split('#')[0];
  return WORKFLOW_STEPS.find(
    (s) => s.path === cleanPath || s.alternatePaths?.includes(cleanPath),
  );
}

export function getNextWorkflowStep(currentId: WorkflowStepId): WorkflowStep | undefined {
  const currentStep = getWorkflowStepById(currentId);
  if (!currentStep) return undefined;
  return WORKFLOW_STEPS.find((s) => s.order === currentStep.order + 1);
}

export function getPreviousWorkflowStep(currentId: WorkflowStepId): WorkflowStep | undefined {
  const currentStep = getWorkflowStepById(currentId);
  if (!currentStep) return undefined;
  return WORKFLOW_STEPS.find((s) => s.order === currentStep.order - 1);
}
