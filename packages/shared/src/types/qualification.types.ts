import { QualificationStatus } from '../enums/qualification.enum';
import { Pathway } from '../enums/pathway.enum';
import { CEFRLevel } from '../enums/cefr.enum';

export interface MissingRequirement {
  id: string;
  category: 'LANGUAGE' | 'DEGREE' | 'EXPERIENCE' | 'DOCUMENT' | 'FINANCIAL';
  title: string;
  description: string;
  severity: 'BLOCKING' | 'RECOMMENDED';
  actionableStep: string;
}

export interface GermanReadinessTrack {
  currentLevel: CEFRLevel;
  targetLevel: CEFRLevel;
  estimatedMonthsToTarget: number;
  readinessHeadline: string;
  tutorialModules: {
    id: string;
    title: string;
    level: CEFRLevel;
    duration: string;
    videoUrl: string;
    description: string;
  }[];
}

export interface GermanResource {
  id: string;
  title: string;
  description: string;
  level: 'A1' | 'A2' | 'B1' | 'A1-B1';
  provider: 'Deutsche Welle (DW)' | 'Goethe-Institut' | 'Easy German';
  url: string;
  type: 'Structured Course' | 'Interactive Exercises' | 'Video & Audio Immersion';
  isPrimary?: boolean;
}

export interface GermanReadinessCalculation {
  currentLevel: string; // e.g. "A1", "A2", "NONE", or "Not yet assessed"
  targetLevel: string;  // e.g. "B1" (Ausbildung) or "B2" (Study / Employment)
  stagesRemaining: number;
  weeksPerLevel: number; // Configurable constant: 8 weeks
  hoursPerWeek: number;  // 10-12 hours/week
  estimatedWeeks: number;
  estimatedMonths: number;
  formulaExplanation: string; // "Calculation: (Target B1 - Current A1 = 2 stages) × 8 weeks = 16 weeks (~4 months) at 10-12 hrs/week."
}

export interface GermanLearningPathData {
  needsGermanSupport: boolean;
  chosenPathway: string;
  readiness: GermanReadinessCalculation;
  resources: GermanResource[];
}

export interface QualificationDiff {
  previousStatus: QualificationStatus;
  simulatedStatus: QualificationStatus;
  statusChanged: boolean;
  scoreDelta: number;
  unlockedRequirementsCount: number;
  summaryText: string;
}

export interface SimulationResultPayload {
  evaluation: QualificationEvaluation;
  diff: QualificationDiff;
}

export type QualificationStatusTier = 'STRONG_MATCH' | 'GOOD_MATCH' | 'CONDITIONAL_MATCH' | 'ACTION_REQUIRED';

export interface QualificationFactorScore {
  id: string;
  factorName: string;
  category: 'ACADEMIC' | 'GERMAN' | 'ENGLISH' | 'EXAMS' | 'PREREQUISITES' | 'EXPERIENCE' | 'DOCUMENTS' | 'FINANCIAL';
  status: 'EXCEEDS_REQUIREMENT' | 'GOOD_MATCH' | 'NEEDS_IMPROVEMENT' | 'MISSING_REQUIREMENT' | 'NOT_APPLICABLE';
  statusLabel: string;
  pointsEarned: number;
  maxPoints: number;
  percentageContribution: number;
  reason: string;
  missingItems?: string[];
  recommendedAction: string;
  actionRoute?: string;
}

export interface QualificationScoringMethodology {
  title: string;
  description: string;
  factorWeights: { factorName: string; weightPercentage: number; description: string }[];
  provisionalNotes?: string;
  disclaimer: string;
}

export interface NextStepActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  targetRoute: string;
  ctaText: string;
}

export interface QualificationEvaluation {
  pathway: Pathway;
  status: QualificationStatus;
  scorePct: number;
  statusTier?: QualificationStatusTier;
  statusLabel?: string;
  isProvisional?: boolean;
  factors?: QualificationFactorScore[];
  methodology?: QualificationScoringMethodology;
  nextSteps?: NextStepActionItem[];
  headline: string;
  summary: string;
  needsGermanSupport: boolean;
  actualGermanLevel?: string;
  passedCriteria: string[];
  missingRequirements: MissingRequirement[];
  germanReadiness?: GermanReadinessTrack;
  simulations?: Record<string, QualificationEvaluation>;
  recommendedService: {
    title: string;
    description: string;
    priceInr?: number;
    entitlementKey: string;
  };
}

export interface WhatIfCriteria {
  germanLevel?: CEFRLevel;
  yearsOfExperience?: number;
  hasDegreeRecognition?: boolean;
  targetPathway?: Pathway;
}

export interface WhatIfResult {
  previousStatus: QualificationStatus;
  simulatedStatus: QualificationStatus;
  changes: string[];
  nowEligiblePathways: Pathway[];
}
