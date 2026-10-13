import {
  GermanCity,
  AccommodationType,
  PathwayType,
  OneTimeRelocationBreakdown,
  MonthlyBudgetBreakdown,
  FinancialFeasibilityAssessment,
  FinancialScenario,
} from '../types/financial.types';
import {
  GERMAN_STATUTORY_CONSTANTS,
  GERMAN_CITIES_CATALOG,
} from '../constants/financial.constants';

export interface CalculateScenarioParams {
  id?: string;
  name?: string;
  cityId: string;
  accommodationType: AccommodationType;
  durationMonths: number;
  exchangeRate?: number;
  pathway?: PathwayType;

  availableSavingsINR: number;
  educationLoanINR: number;
  familySupportMonthlyEUR?: number;
  scholarshipMonthlyEUR?: number;
  hasScholarshipConfirmed?: boolean;

  plansToWorkPartTime?: boolean;
  workHoursPerWeek?: number;
  hourlyWageEUR?: number;

  customRentEUR?: number;
  customFoodEUR?: number;
  customLeisureEUR?: number;
}

/**
 * Deterministic Financial Reality Calculation Engine
 * Used uniformly across the frontend simulator and backend services.
 */
export function calculateFinancialScenario(
  params: CalculateScenarioParams,
  citiesCatalog: GermanCity[] = GERMAN_CITIES_CATALOG,
): FinancialScenario {
  const city =
    citiesCatalog.find((c) => c.id === params.cityId) ||
    citiesCatalog[0] ||
    GERMAN_CITIES_CATALOG[0];

  const rate = params.exchangeRate && params.exchangeRate > 0
    ? params.exchangeRate
    : GERMAN_STATUTORY_CONSTANTS.DEFAULT_EUR_TO_INR_RATE;

  const duration = Math.max(1, params.durationMonths || 12);
  const pathway = params.pathway || 'MASTER';

  // 1. Accommodation Rent Determination
  let rentEUR: number;
  if (params.customRentEUR !== undefined && params.customRentEUR > 0) {
    rentEUR = params.customRentEUR;
  } else if (params.accommodationType === 'STUDENT_DORM') {
    rentEUR = city.avgRentDormEUR;
  } else if (params.accommodationType === 'PRIVATE_STUDIO') {
    rentEUR = city.avgRentStudioEUR;
  } else {
    // WG Shared flat
    rentEUR = city.avgRentWgEUR;
  }

  // 2. One-Time Relocation Breakdown
  const blockedAccountDepositEUR = GERMAN_STATUTORY_CONSTANTS.BLOCKED_ACCOUNT_ANNUAL_EUR;
  const blockedAccountSetupFeeEUR = GERMAN_STATUTORY_CONSTANTS.BLOCKED_ACCOUNT_SETUP_FEE_EUR;
  const apsIndiaFeeINR = GERMAN_STATUTORY_CONSTANTS.APS_INDIA_FEE_INR;
  const apsIndiaFeeEUR = Math.round((apsIndiaFeeINR / rate) * 100) / 100;
  const visaFeeEUR = GERMAN_STATUTORY_CONSTANTS.VISA_APPLICATION_FEE_EUR;
  const visaFeeINR = Math.round(visaFeeEUR * rate);
  const flightTicketINR = GERMAN_STATUTORY_CONSTANTS.DEFAULT_FLIGHT_TICKET_INR;
  const flightTicketEUR = Math.round((flightTicketINR / rate) * 100) / 100;
  const rentalKautionDepositEUR = Math.round(rentEUR * 2.5);
  const semesterFeeEUR = city.semesterContributionAvgEUR;
  const settlingInClothingEUR = 500;

  const totalRelocationEUR = Math.round(
    blockedAccountDepositEUR +
      blockedAccountSetupFeeEUR +
      apsIndiaFeeEUR +
      visaFeeEUR +
      flightTicketEUR +
      rentalKautionDepositEUR +
      semesterFeeEUR +
      settlingInClothingEUR,
  );
  const totalRelocationINR = Math.round(totalRelocationEUR * rate);

  const relocation: OneTimeRelocationBreakdown = {
    blockedAccountDepositEUR,
    blockedAccountSetupFeeEUR,
    apsIndiaFeeINR,
    apsIndiaFeeEUR,
    visaFeeEUR,
    visaFeeINR,
    flightTicketINR,
    flightTicketEUR,
    rentalKautionDepositEUR,
    semesterFeeEUR,
    settlingInClothingEUR,
    totalRelocationEUR,
    totalRelocationINR,
  };

  // 3. Monthly Budget Breakdown
  const healthInsuranceEUR = GERMAN_STATUTORY_CONSTANTS.STATUTORY_HEALTH_INSURANCE_EUR;
  const foodEUR =
    params.customFoodEUR !== undefined && params.customFoodEUR > 0
      ? params.customFoodEUR
      : city.avgFoodEUR;
  const transportEUR = city.avgTransportEUR;

  const utilitiesInternetEUR =
    params.accommodationType === 'STUDENT_DORM'
      ? 20
      : params.accommodationType === 'PRIVATE_STUDIO'
      ? 65
      : 35; // WG

  const broadcastingFeeEUR =
    params.accommodationType === 'STUDENT_DORM'
      ? 0
      : params.accommodationType === 'PRIVATE_STUDIO'
      ? GERMAN_STATUTORY_CONSTANTS.STATUTORY_GEZ_BROADCASTING_FEE_EUR
      : 6.12; // 18.36 split between 3 WG flatmates

  const leisurePersonalEUR =
    params.customLeisureEUR !== undefined && params.customLeisureEUR > 0
      ? params.customLeisureEUR
      : city.avgLeisureEUR;

  const tuitionFeeMonthlyEUR = city.hasNonEuTuitionFee
    ? Math.round(city.nonEuTuitionPerSemesterEUR / 6)
    : 0;

  const totalMonthlyExpensesEUR = Math.round(
    rentEUR +
      healthInsuranceEUR +
      foodEUR +
      transportEUR +
      utilitiesInternetEUR +
      broadcastingFeeEUR +
      leisurePersonalEUR +
      tuitionFeeMonthlyEUR,
  );
  const totalMonthlyExpensesINR = Math.round(totalMonthlyExpensesEUR * rate);

  // Inflows
  const blockedAccountPayoutEUR = GERMAN_STATUTORY_CONSTANTS.BLOCKED_ACCOUNT_MONTHLY_PAYOUT_EUR;

  const plansToWork = params.plansToWorkPartTime ?? true;
  const workHours = Math.min(
    GERMAN_STATUTORY_CONSTANTS.MAX_STUDENT_WORK_HOURS_PER_WEEK,
    Math.max(0, params.workHoursPerWeek ?? 12),
  );
  const wage = params.hourlyWageEUR && params.hourlyWageEUR > 0
    ? params.hourlyWageEUR
    : city.avgStudentHourlyWageEUR;

  const partTimeEarningsEUR = plansToWork
    ? Math.round(workHours * wage * 4.33)
    : 0;

  const scholarshipMonthlyEUR = params.scholarshipMonthlyEUR || 0;
  const familySupportMonthlyEUR = params.familySupportMonthlyEUR || 0;

  const totalMonthlyInflowsEUR = Math.round(
    blockedAccountPayoutEUR +
      partTimeEarningsEUR +
      scholarshipMonthlyEUR +
      familySupportMonthlyEUR,
  );
  const totalMonthlyInflowsINR = Math.round(totalMonthlyInflowsEUR * rate);

  const netMonthlyBalanceEUR = totalMonthlyInflowsEUR - totalMonthlyExpensesEUR;
  const netMonthlyBalanceINR = Math.round(netMonthlyBalanceEUR * rate);
  const isDeficit = netMonthlyBalanceEUR < 0;

  const monthly: MonthlyBudgetBreakdown = {
    rentEUR,
    healthInsuranceEUR,
    foodEUR,
    transportEUR,
    utilitiesInternetEUR,
    broadcastingFeeEUR,
    leisurePersonalEUR,
    tuitionFeeMonthlyEUR,
    totalMonthlyExpensesEUR,
    totalMonthlyExpensesINR,

    blockedAccountPayoutEUR,
    partTimeEarningsEUR,
    scholarshipMonthlyEUR,
    familySupportMonthlyEUR,
    totalMonthlyInflowsEUR,
    totalMonthlyInflowsINR,

    netMonthlyBalanceEUR,
    netMonthlyBalanceINR,
    isDeficit,
  };

  // 4. Multi-Year Totals for Duration
  // Note: Upfront relocation includes €11,904 blocked deposit, which pays out €992/mo for the first 12 months.
  // Upfront cash needed before departure: totalRelocationEUR
  // Ongoing net budget after relocation:
  const immediateMovingCostsWithoutBlocked = totalRelocationEUR - blockedAccountDepositEUR;
  const totalProjectedCostEUR = Math.round(
    immediateMovingCostsWithoutBlocked + totalMonthlyExpensesEUR * duration,
  );
  const totalProjectedCostINR = Math.round(totalProjectedCostEUR * rate);

  // Total funds available over duration:
  const totalInitialCapitalINR = (params.availableSavingsINR || 0) + (params.educationLoanINR || 0);
  const totalInitialCapitalEUR = totalInitialCapitalINR / rate;

  const monthlyInflowExcludingBlocked =
    partTimeEarningsEUR + scholarshipMonthlyEUR + familySupportMonthlyEUR;
  const totalProjectedInflowEUR = Math.round(
    totalInitialCapitalEUR + monthlyInflowExcludingBlocked * duration,
  );
  const totalProjectedInflowINR = Math.round(totalProjectedInflowEUR * rate);

  const netOverallGapEUR = totalProjectedInflowEUR - totalProjectedCostEUR;
  const netOverallGapINR = Math.round(netOverallGapEUR * rate);

  // 5. Upfront Affordability & Savings Runway
  const upfrontCovered = totalInitialCapitalEUR >= totalRelocationEUR;
  const upfrontShortfallEUR = upfrontCovered
    ? 0
    : Math.round(totalRelocationEUR - totalInitialCapitalEUR);
  const upfrontShortfallINR = Math.round(upfrontShortfallEUR * rate);

  const remainingCapitalAfterUpfrontEUR = totalInitialCapitalEUR - totalRelocationEUR;
  let savingsRunwayMonths: number;

  if (netMonthlyBalanceEUR >= 0) {
    // Self-sustaining through payouts + earnings
    savingsRunwayMonths = 999;
  } else if (remainingCapitalAfterUpfrontEUR <= 0) {
    savingsRunwayMonths = 0;
  } else {
    const monthlyDeficit = Math.abs(netMonthlyBalanceEUR);
    savingsRunwayMonths = Math.min(
      duration,
      Math.floor(remainingCapitalAfterUpfrontEUR / monthlyDeficit),
    );
  }

  // 6. Feasibility Score & Qualitative Assessment
  let score = 0;

  // Upfront score component (max 40 pts)
  if (upfrontCovered) {
    score += 40;
    const surplusRatio = remainingCapitalAfterUpfrontEUR / 3000;
    if (surplusRatio > 0.5) score = Math.min(50, score + 10);
  } else {
    const coveragePct = totalInitialCapitalEUR / totalRelocationEUR;
    score += Math.round(coveragePct * 30);
  }

  // Monthly balance score component (max 35 pts)
  if (netMonthlyBalanceEUR >= 100) {
    score += 35;
  } else if (netMonthlyBalanceEUR >= 0) {
    score += 30;
  } else if (netMonthlyBalanceEUR >= -150) {
    score += 20;
  } else if (netMonthlyBalanceEUR >= -300) {
    score += 10;
  } else {
    score += 0;
  }

  // Runway score component (max 15 pts)
  if (savingsRunwayMonths === 999 || savingsRunwayMonths >= duration) {
    score += 15;
  } else if (savingsRunwayMonths >= Math.round(duration / 2)) {
    score += 10;
  } else {
    score += Math.round((savingsRunwayMonths / duration) * 8);
  }

  score = Math.min(100, Math.max(10, score));

  let rating: 'STRONG' | 'MODERATE' | 'HIGH_RISK';
  let headline: string;

  if (score >= 75) {
    rating = 'STRONG';
    headline = 'Strong Financial Feasibility — Plan is Well-Funded & Low-Risk';
  } else if (score >= 50) {
    rating = 'MODERATE';
    headline = 'Moderate Feasibility — Manageable but Reliant on Part-Time Student Income';
  } else {
    rating = 'HIGH_RISK';
    headline = 'High Financial Risk — Capital Shortfall for Upfront Relocation or Blocked Account';
  }

  // Strengths, Risks & Personalized Recommendations
  const keyStrengths: string[] = [];
  const riskFactors: string[] = [];
  const actionableRecommendations: string[] = [];

  if (upfrontCovered) {
    keyStrengths.push(
      `Full upfront relocation capital (€${totalRelocationEUR.toLocaleString()} / ₹${Math.round(totalRelocationINR / 100000)} Lakhs) is completely funded.`,
    );
  } else {
    riskFactors.push(
      `Upfront shortfall of €${upfrontShortfallEUR.toLocaleString()} (₹${Math.round(upfrontShortfallINR / 100000)} Lakhs) to fulfill the statutory Blocked Account (€11,904) and flight/visa expenses.`,
    );
    actionableRecommendations.push(
      'Consider applying for an Indian NBFC or public sector education loan (SBI, HDFC Credila, Prodigy) to finance the initial Sperrkonto deposit.',
    );
  }

  if (netMonthlyBalanceEUR >= 0) {
    keyStrengths.push(
      `Monthly budget yields a surplus of +€${netMonthlyBalanceEUR}/month, protecting against unforeseen inflation or medical costs.`,
    );
  } else {
    riskFactors.push(
      `Monthly funding deficit of -€${Math.abs(netMonthlyBalanceEUR)}/month (${Math.abs(netMonthlyBalanceINR)} INR).`,
    );
  }

  if (city.hasNonEuTuitionFee) {
    riskFactors.push(
      `Baden-Württemberg state institutes (€1,500/semester tuition) add €250/month to your baseline living expenses.`,
    );
    actionableRecommendations.push(
      `Explore comparable universities in Bavaria, NRW (e.g. RWTH Aachen), or Saxony (TU Dresden, Leipzig) which charge zero non-EU tuition fees.`,
    );
  }

  if (params.accommodationType === 'PRIVATE_STUDIO') {
    actionableRecommendations.push(
      `Switching from a private studio (€${city.avgRentStudioEUR}/mo) to a shared WG flat (€${city.avgRentWgEUR}/mo) or Studentenwohnheim (€${city.avgRentDormEUR}/mo) will save between €${city.avgRentStudioEUR - city.avgRentWgEUR} and €${city.avgRentStudioEUR - city.avgRentDormEUR} every single month.`,
    );
  }

  if (city.tier === 'VERY_HIGH') {
    actionableRecommendations.push(
      `Munich has Germany's highest housing costs. Register for Studierendenwerk dormitories as soon as you receive your conditional admission letter to secure subsidized housing.`,
    );
  }

  if (plansToWork && workHours > 0) {
    keyStrengths.push(
      `Part-time Werkstudent work contributes €${partTimeEarningsEUR}/month (~₹${partTimeEarningsEUR * Math.round(rate)}) towards local living expenses.`,
    );
  } else {
    actionableRecommendations.push(
      `Under German student visa regulations, non-EU students can work 140 full days (or 280 half days) per year. Working 10–15 hours/week as a Werkstudent comfortably offsets living costs.`,
    );
  }

  const feasibility: FinancialFeasibilityAssessment = {
    score,
    rating,
    headline,
    savingsRunwayMonths,
    upfrontCovered,
    upfrontShortfallEUR,
    upfrontShortfallINR,
    monthlyDeficitEUR: isDeficit ? Math.abs(netMonthlyBalanceEUR) : 0,
    monthlyDeficitINR: isDeficit ? Math.abs(netMonthlyBalanceINR) : 0,
    keyStrengths,
    riskFactors,
    actionableRecommendations,
  };

  return {
    id: params.id || `scenario_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: params.name || `${city.name} - ${params.accommodationType.replace('_', ' ')}`,
    cityId: city.id,
    accommodationType: params.accommodationType,
    durationMonths: duration,
    exchangeRate: rate,
    pathway,

    availableSavingsINR: params.availableSavingsINR || 0,
    educationLoanINR: params.educationLoanINR || 0,
    familySupportMonthlyEUR: params.familySupportMonthlyEUR || 0,
    scholarshipMonthlyEUR: params.scholarshipMonthlyEUR || 0,
    hasScholarshipConfirmed: params.hasScholarshipConfirmed ?? false,

    plansToWorkPartTime: plansToWork,
    workHoursPerWeek: workHours,
    hourlyWageEUR: wage,

    customRentEUR: params.customRentEUR,
    customFoodEUR: params.customFoodEUR,
    customLeisureEUR: params.customLeisureEUR,

    relocation,
    monthly,
    totalProjectedCostEUR,
    totalProjectedCostINR,
    totalProjectedInflowEUR,
    totalProjectedInflowINR,
    netOverallGapEUR,
    netOverallGapINR,
    recommendations: actionableRecommendations,
    budgetRiskFactors: riskFactors,
    feasibility,
    updatedAt: new Date().toISOString(),
  };
}

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
