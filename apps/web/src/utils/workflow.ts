import {
  WORKFLOW_STEPS,
  WorkflowStep,
  WorkflowStepId,
  getWorkflowStepById,
  getWorkflowStepByPath,
  getNextWorkflowStep,
  getPreviousWorkflowStep,
} from '@educaro/shared';

export {
  WORKFLOW_STEPS,
  getWorkflowStepById,
  getWorkflowStepByPath,
  getNextWorkflowStep,
  getPreviousWorkflowStep,
};
export type { WorkflowStep, WorkflowStepId };

export interface WorkflowProgressState {
  completedStepIds: WorkflowStepId[];
  progressPct: number;
  completedCount: number;
  totalCoreSteps: number;
  nextIncompleteStep: WorkflowStep;
}

/**
 * Calculates deterministic journey progress based on real saved state and API records.
 */
export function calculateWorkflowProgress(params: {
  user?: any | null;
  profileCompletenessPct?: number;
  hasDocumentsUploaded?: boolean;
  hasQualificationCalculated?: boolean;
  hasViewedRecommendations?: boolean;
  hasSavedScholarships?: boolean;
  hasConfiguredFinance?: boolean;
  hasRoadmapProgress?: boolean;
}): WorkflowProgressState {
  const {
    user,
    profileCompletenessPct = 0,
    hasDocumentsUploaded = false,
    hasQualificationCalculated = false,
    hasViewedRecommendations = false,
    hasSavedScholarships = false,
    hasConfiguredFinance = false,
    hasRoadmapProgress = false,
  } = params;

  const completedStepIds: WorkflowStepId[] = [];

  if (user) {
    completedStepIds.push('home');
  }

  // Profile is complete if completeness is at least 60%
  const isProfileComplete = profileCompletenessPct >= 60;
  if (isProfileComplete) {
    completedStepIds.push('profile');
  }

  // Documents
  if (hasDocumentsUploaded) {
    completedStepIds.push('documents');
  }

  // Qualification
  if (hasQualificationCalculated) {
    completedStepIds.push('qualification');
  }

  // Recommendations
  if (hasViewedRecommendations) {
    completedStepIds.push('recommendations');
  }

  // Scholarships
  if (hasSavedScholarships) {
    completedStepIds.push('scholarships');
  }

  // Finance Simulator
  if (hasConfiguredFinance) {
    completedStepIds.push('finance-simulator');
  }

  // Roadmap
  if (hasRoadmapProgress) {
    completedStepIds.push('roadmap');
  }

  // Core mandatory workflow steps (Profile through Roadmap = 7 steps)
  const coreStepIds: WorkflowStepId[] = [
    'profile',
    'documents',
    'qualification',
    'recommendations',
    'scholarships',
    'finance-simulator',
    'roadmap',
  ];

  const completedCoreCount = coreStepIds.filter((id) => completedStepIds.includes(id)).length;
  const progressPct = Math.round((completedCoreCount / coreStepIds.length) * 100);

  // Determine next incomplete step for returning user
  let nextStepId: WorkflowStepId = 'profile';
  if (!isProfileComplete) {
    nextStepId = 'profile';
  } else if (!hasDocumentsUploaded) {
    nextStepId = 'documents';
  } else if (!hasQualificationCalculated) {
    nextStepId = 'qualification';
  } else if (!hasViewedRecommendations) {
    nextStepId = 'recommendations';
  } else if (!hasSavedScholarships) {
    nextStepId = 'scholarships';
  } else if (!hasConfiguredFinance) {
    nextStepId = 'finance-simulator';
  } else {
    nextStepId = 'roadmap';
  }

  const nextIncompleteStep = getWorkflowStepById(nextStepId) || WORKFLOW_STEPS[1];

  return {
    completedStepIds,
    progressPct,
    completedCount: completedCoreCount,
    totalCoreSteps: coreStepIds.length,
    nextIncompleteStep,
  };
}

/**
 * Determine the route a user should be navigated to when clicking "Start My Journey".
 * - If not logged in -> Sign Up
 * - If logged in and new -> Profile (/journey/details)
 * - If logged in and returning -> Next incomplete step
 */
export function getResumeRoute(user: any | null, journeyState?: any | null): string {
  if (!user) {
    return '/auth?mode=signup';
  }

  // Read local flags where available
  const hasProfile = Boolean(
    (journeyState?.profileCompletenessPct && journeyState.profileCompletenessPct >= 60) ||
      localStorage.getItem('educaro_profile_cache'),
  );

  const hasDocs = Boolean(
    journeyState?.completedSteps?.includes('DOCUMENTS') ||
      localStorage.getItem('educaro_docs_uploaded') === 'true',
  );

  const hasQual = Boolean(
    localStorage.getItem('educaro_qualification_evaluation') ||
      journeyState?.completedSteps?.includes('QUALIFICATION'),
  );

  const hasRecs = Boolean(localStorage.getItem('educaro_recommendations_viewed') === 'true');
  const hasSchol = Boolean(localStorage.getItem('educaro_scholarships_viewed') === 'true');
  const hasFin = Boolean(localStorage.getItem('educaro_financial_configured') === 'true');

  if (!hasProfile) return '/journey/details';
  if (!hasDocs) return '/journey/documents';
  if (!hasQual) return '/journey/qualification';
  if (!hasRecs) return '/journey/recommendations';
  if (!hasSchol) return '/journey/scholarships';
  if (!hasFin) return '/journey/financial-simulator';
  return '/journey/roadmap';
}
