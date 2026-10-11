import * as fs from 'fs';
import * as path from 'path';

export type PathwayStatus = 'ELIGIBLE' | 'PARTIAL' | 'NOT_YET';

export interface RuleDefinition {
  ruleId: string;
  name: string;
  field: string;
  aliases?: string[];
  operator: 'exists' | 'numeric_gte' | 'cefr_gte' | 'matches';
  expectedValue: any;
  weight: 'CRITICAL' | 'IMPORTANT' | 'PREFERRED';
  description: string;
  assumption: string;
  remediation?: string;
}

export interface PathwayConfig {
  pathway: string;
  title: string;
  description: string;
  rules: RuleDefinition[];
}

export interface RuleResult {
  ruleId: string;
  name: string;
  field: string;
  actualValue: string | null;
  expectedValue: any;
  weight: string;
  passed: boolean;
  description: string;
  assumption: string;
  remediation?: string;
}

export interface EvaluationResult {
  status: PathwayStatus;
  pathway: string;
  passed: RuleResult[];
  missing: RuleResult[];
  scorePct: number;
}

const CEFR_ORDER: Record<string, number> = {
  NONE: 0,
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

function getCefrRank(val?: string | null): number {
  if (!val) return 0;
  const upper = val.toUpperCase().trim();
  for (const level of ['C2', 'C1', 'B2', 'B1', 'A2', 'A1']) {
    if (upper.includes(level)) return CEFR_ORDER[level];
  }
  return 0;
}

/**
 * Extracts a field value from flat profile map, StructuredProfile, or ProfileFieldRecord array.
 */
function extractFieldValue(profile: any, fieldKey: string, aliases: string[] = []): string | null {
  if (!profile) return null;

  const keysToCheck = [fieldKey, ...aliases];

  // 1. Direct key-value object
  for (const k of keysToCheck) {
    if (profile[k] !== undefined && profile[k] !== null && String(profile[k]).trim() !== '') {
      if (typeof profile[k] === 'object' && profile[k].value !== undefined) {
        return String(profile[k].value);
      }
      return String(profile[k]);
    }
  }

  // 2. Structured profile with entities (e.g., profile.personal.fullName, profile.education.degreeName)
  const categories = ['personal', 'education', 'employment', 'skills', 'languages', 'documents', 'motivation', 'media', 'qualification', 'recommendedJourney'];
  for (const cat of categories) {
    if (profile[cat] && typeof profile[cat] === 'object') {
      for (const k of keysToCheck) {
        if (profile[cat][k] !== undefined && profile[cat][k] !== null) {
          const v = profile[cat][k];
          if (typeof v === 'object' && v.value !== undefined) {
            return String(v.value);
          }
          return String(v);
        }
      }
    }
  }

  // 3. Array of ProfileFieldRecord
  if (Array.isArray(profile.fields)) {
    for (const k of keysToCheck) {
      const match = profile.fields.find((f: any) => f.fieldKey?.toLowerCase() === k.toLowerCase());
      if (match && match.value && match.value.trim() !== '') {
        return String(match.value);
      }
    }
  }

  return null;
}

/**
 * Loads pathways config from apps/api/src/rules/pathways.json.
 * Pure function helper: Adding a new pathway in JSON requires NO code modification.
 */
export function loadPathwaysConfig(customPath?: string): Record<string, PathwayConfig> {
  if (customPath && fs.existsSync(customPath)) {
    return JSON.parse(fs.readFileSync(customPath, 'utf-8'));
  }
  const possiblePaths = [
    path.resolve(__dirname, 'pathways.json'),
    path.resolve(__dirname, '..', 'src', 'rules', 'pathways.json'),
    path.resolve(process.cwd(), 'src', 'rules', 'pathways.json'),
    path.resolve(process.cwd(), 'apps', 'api', 'src', 'rules', 'pathways.json'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  }
  try {
    return require('./pathways.json');
  } catch {
    throw new Error('pathways.json configuration could not be found.');
  }
}

/**
 * Pure evaluation function: evaluate(profile, pathway).
 * Deterministically checks all rules in the JSON pathway config.
 * Hard Rule 2: Eligibility logic is deterministic code + JSON config.
 */
export function evaluate(
  profile: any,
  targetPathway: string = 'STUDY',
  pathwaysConfig?: Record<string, PathwayConfig>
): EvaluationResult {
  const configs = pathwaysConfig || loadPathwaysConfig();

  // Normalize pathway key (support alias like EMPLOYMENT -> BLUE_CARD)
  let pathwayKey = targetPathway.toUpperCase().trim();
  if (pathwayKey.includes('BLUE') || pathwayKey.includes('EMPLOYMENT') || pathwayKey.includes('WORK') || pathwayKey.includes('JOB')) {
    pathwayKey = 'BLUE_CARD';
  } else if (pathwayKey.includes('STUDY') || pathwayKey.includes('UNIVERSITY') || pathwayKey.includes('MASTER')) {
    pathwayKey = 'STUDY';
  }

  const pathwayConfig = configs[pathwayKey] || configs['STUDY'];
  const rules = pathwayConfig.rules || [];

  const passed: RuleResult[] = [];
  const missing: RuleResult[] = [];

  for (const rule of rules) {
    const actual = extractFieldValue(profile, rule.field, rule.aliases || []);
    let isPassed = false;

    if (actual && actual.trim() !== '') {
      switch (rule.operator) {
        case 'exists':
          isPassed = actual.trim().length > 0;
          break;

        case 'numeric_gte': {
          const numericMatch = actual.match(/\d+(\.\d+)?/);
          const val = numericMatch ? parseFloat(numericMatch[0]) : 0;
          const expected = typeof rule.expectedValue === 'number' ? rule.expectedValue : parseFloat(rule.expectedValue);
          isPassed = val >= expected;
          break;
        }

        case 'cefr_gte': {
          const actualRank = getCefrRank(actual);
          const expectedRank = getCefrRank(String(rule.expectedValue));
          isPassed = actualRank >= expectedRank && actualRank > 0;
          break;
        }

        case 'matches': {
          const keywords = String(rule.expectedValue).toLowerCase().split(',').map(s => s.trim());
          const actualLower = actual.toLowerCase();
          isPassed = keywords.some(kw => actualLower.includes(kw));
          break;
        }

        default:
          isPassed = actual.trim().length > 0;
      }
    }

    const item: RuleResult = {
      ruleId: rule.ruleId,
      name: rule.name,
      field: rule.field,
      actualValue: actual,
      expectedValue: rule.expectedValue,
      weight: rule.weight,
      passed: isPassed,
      description: rule.description,
      assumption: rule.assumption,
      remediation: rule.remediation,
    };

    if (isPassed) {
      passed.push(item);
    } else {
      missing.push(item);
    }
  }

  // Deterministic Status Calculation:
  // ELIGIBLE: All CRITICAL rules passed and total passed >= 4
  // PARTIAL: At least 2 rules passed (or at least 1 critical rule passed)
  // NOT_YET: Less than 2 rules passed
  const criticalMissing = missing.filter(m => m.weight === 'CRITICAL');

  let status: PathwayStatus = 'NOT_YET';
  if (criticalMissing.length === 0 && missing.length === 0) {
    status = 'ELIGIBLE';
  } else if (criticalMissing.length === 0 && missing.length <= 1) {
    status = 'ELIGIBLE';
  } else if (passed.length >= 2 || (passed.length >= 1 && criticalMissing.length < rules.filter(r => r.weight === 'CRITICAL').length)) {
    status = 'PARTIAL';
  } else {
    status = 'NOT_YET';
  }

  const scorePct = rules.length > 0 ? Math.round((passed.length / rules.length) * 100) : 0;

  return {
    status,
    pathway: pathwayKey,
    passed,
    missing,
    scorePct,
  };
}
