export type GermanCityId =
  | 'munich'
  | 'berlin'
  | 'frankfurt'
  | 'hamburg'
  | 'stuttgart'
  | 'aachen'
  | 'heidelberg'
  | 'leipzig'
  | 'dresden'
  | 'bremen';

export type CityLivingCostTier = 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';

export type AccommodationType = 'WG_SHARED' | 'STUDENT_DORM' | 'PRIVATE_STUDIO';

export type PathwayType = 'BACHELOR' | 'MASTER' | 'AUSBILDUNG' | 'JOB_SEEKER';

export interface GermanCity {
  id: GermanCityId;
  name: string;
  state: string;
  tier: CityLivingCostTier;
  avgRentWgEUR: number;
  avgRentDormEUR: number;
  avgRentStudioEUR: number;
  avgFoodEUR: number;
  avgTransportEUR: number;
  avgLeisureEUR: number;
  semesterContributionAvgEUR: number;
  hasNonEuTuitionFee: boolean; // true for Baden-Württemberg (€1,500/sem)
  nonEuTuitionPerSemesterEUR: number;
  partTimeJobMarket: 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'MODERATE';
  avgStudentHourlyWageEUR: number;
  description: string;
  keyUniversities: string[];
}

export interface OneTimeRelocationBreakdown {
  blockedAccountDepositEUR: number; // €11,904 statutory
  blockedAccountSetupFeeEUR: number; // ~€89
  apsIndiaFeeINR: number; // ₹18,000
  apsIndiaFeeEUR: number;
  visaFeeEUR: number; // €75
  visaFeeINR: number;
  flightTicketINR: number; // ~₹50,000
  flightTicketEUR: number;
  rentalKautionDepositEUR: number; // 2.5 months cold rent
  semesterFeeEUR: number;
  settlingInClothingEUR: number; // winter coat, bedding, etc. ~€500
  totalRelocationEUR: number;
  totalRelocationINR: number;
}

export interface MonthlyBudgetBreakdown {
  rentEUR: number;
  healthInsuranceEUR: number; // statutory ~€125
  foodEUR: number;
  transportEUR: number; // ~€29
  utilitiesInternetEUR: number; // ~€35
  broadcastingFeeEUR: number; // statutory GEZ €18.36 split or full
  leisurePersonalEUR: number;
  tuitionFeeMonthlyEUR: number;
  totalMonthlyExpensesEUR: number;
  totalMonthlyExpensesINR: number;

  // Monthly Inflows
  blockedAccountPayoutEUR: number; // €992/mo
  partTimeEarningsEUR: number; // hourlyWage * hours * 4.33
  scholarshipMonthlyEUR: number;
  familySupportMonthlyEUR: number;
  totalMonthlyInflowsEUR: number;
  totalMonthlyInflowsINR: number;

  // Balance
  netMonthlyBalanceEUR: number; // positive = surplus, negative = gap
  netMonthlyBalanceINR: number;
  isDeficit: boolean;
}

export interface FinancialFeasibilityAssessment {
  score: number; // 0 - 100
  rating: 'STRONG' | 'MODERATE' | 'HIGH_RISK';
  headline: string;
  savingsRunwayMonths: number;
  upfrontCovered: boolean;
  upfrontShortfallEUR: number;
  upfrontShortfallINR: number;
  monthlyDeficitEUR: number;
  monthlyDeficitINR: number;
  keyStrengths: string[];
  riskFactors: string[];
  actionableRecommendations: string[];
}

export interface FinancialScenario {
  id: string;
  name: string;
  cityId: GermanCityId;
  accommodationType: AccommodationType;
  durationMonths: number; // 6, 12, 24, 36
  exchangeRate: number; // default ~90.5
  pathway: PathwayType;

  // Financial capital inputs
  availableSavingsINR: number;
  educationLoanINR: number;
  familySupportMonthlyEUR: number;
  scholarshipMonthlyEUR: number;
  hasScholarshipConfirmed: boolean;

  // Part-time employment assumptions
  plansToWorkPartTime: boolean;
  workHoursPerWeek: number; // max 20
  hourlyWageEUR: number; // minimum wage ~€12.82 to €16

  // Custom user expense overrides (optional, if modified from city defaults)
  customRentEUR?: number;
  customFoodEUR?: number;
  customLeisureEUR?: number;

  // Calculated outputs (computed deterministically)
  relocation: OneTimeRelocationBreakdown;
  monthly: MonthlyBudgetBreakdown;
  totalProjectedCostEUR: number;
  totalProjectedCostINR: number;
  totalProjectedInflowEUR: number;
  totalProjectedInflowINR: number;
  netOverallGapEUR: number;
  netOverallGapINR: number;
  recommendations: string[];
  budgetRiskFactors: string[];
  feasibility?: FinancialFeasibilityAssessment;
  updatedAt: string;
}

export interface FinancialDataSourceInfo {
  sourceName: string;
  officialPublisher: string;
  publicationYear: number;
  lastUpdated: string;
  description: string;
  statutoryReference?: string;
  officialUrl: string;
}
