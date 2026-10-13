import { GermanCity, FinancialDataSourceInfo } from '../types/financial.types';

export const GERMAN_STATUTORY_CONSTANTS = {
  // Statutory annual blocked account required by German Federal Foreign Office (2026)
  BLOCKED_ACCOUNT_ANNUAL_EUR: 11904,
  BLOCKED_ACCOUNT_MONTHLY_PAYOUT_EUR: 992,
  BLOCKED_ACCOUNT_SETUP_FEE_EUR: 89,

  // APS India official certification fee
  APS_INDIA_FEE_INR: 18000,

  // German National Student Visa Application Fee (VFS / Embassy)
  VISA_APPLICATION_FEE_EUR: 75,

  // Estimated Flight Ticket (India -> Germany one-way student fare)
  DEFAULT_FLIGHT_TICKET_INR: 50000,

  // Statutory Student Health Insurance (e.g., TK, AOK, Barmer monthly average)
  STATUTORY_HEALTH_INSURANCE_EUR: 125,

  // Statutory German Broadcasting Contribution (Rundfunkbeitrag / GEZ monthly fee per flat)
  STATUTORY_GEZ_BROADCASTING_FEE_EUR: 18.36,

  // Default exchange rate EUR to INR (conservative benchmark)
  DEFAULT_EUR_TO_INR_RATE: 90.5,

  // Statutory German Minimum Wage 2026
  GERMAN_MINIMUM_WAGE_HOURLY_EUR: 12.82,

  // Standard Werkstudent maximum legal weekly hours during semester
  MAX_STUDENT_WORK_HOURS_PER_WEEK: 20,
};

export const GERMAN_CITIES_CATALOG: GermanCity[] = [
  {
    id: 'munich',
    name: 'Munich (München)',
    state: 'Bavaria',
    tier: 'VERY_HIGH',
    avgRentWgEUR: 680,
    avgRentDormEUR: 380,
    avgRentStudioEUR: 980,
    avgFoodEUR: 250,
    avgTransportEUR: 29,
    avgLeisureEUR: 160,
    semesterContributionAvgEUR: 152,
    hasNonEuTuitionFee: false,
    nonEuTuitionPerSemesterEUR: 0,
    partTimeJobMarket: 'EXCELLENT',
    avgStudentHourlyWageEUR: 16.5,
    description:
      "Germany's premier tech and academic capital (TUM & LMU). Highest rental market in Germany, offset by Bavaria's booming job ecosystem and world-leading corporate headquarters.",
    keyUniversities: ['Technical University of Munich (TUM)', 'Ludwig Maximilian University (LMU)', 'Munich University of Applied Sciences (HM)'],
  },
  {
    id: 'berlin',
    name: 'Berlin',
    state: 'Berlin',
    tier: 'HIGH',
    avgRentWgEUR: 560,
    avgRentDormEUR: 340,
    avgRentStudioEUR: 820,
    avgFoodEUR: 230,
    avgTransportEUR: 29,
    avgLeisureEUR: 140,
    semesterContributionAvgEUR: 315,
    hasNonEuTuitionFee: false,
    nonEuTuitionPerSemesterEUR: 0,
    partTimeJobMarket: 'EXCELLENT',
    avgStudentHourlyWageEUR: 15.0,
    description:
      'Vibrant European capital and startup powerhouse. International atmosphere with thriving student culture, though housing competition remains competitive in central boroughs.',
    keyUniversities: ['TU Berlin', 'Humboldt University (HU Berlin)', 'Free University of Berlin (FU)', 'HTW Berlin'],
  },
  {
    id: 'frankfurt',
    name: 'Frankfurt am Main',
    state: 'Hesse',
    tier: 'HIGH',
    avgRentWgEUR: 590,
    avgRentDormEUR: 360,
    avgRentStudioEUR: 850,
    avgFoodEUR: 240,
    avgTransportEUR: 31,
    avgLeisureEUR: 150,
    semesterContributionAvgEUR: 385,
    hasNonEuTuitionFee: false,
    nonEuTuitionPerSemesterEUR: 0,
    partTimeJobMarket: 'EXCELLENT',
    avgStudentHourlyWageEUR: 16.0,
    description:
      "Continental Europe's primary financial hub. Unmatched access to banks, fintechs, and international consultancies with excellent part-time student employment options.",
    keyUniversities: ['Goethe University Frankfurt', 'Frankfurt University of Applied Sciences', 'Frankfurt School of Finance'],
  },
  {
    id: 'hamburg',
    name: 'Hamburg',
    state: 'Hamburg',
    tier: 'HIGH',
    avgRentWgEUR: 540,
    avgRentDormEUR: 350,
    avgRentStudioEUR: 790,
    avgFoodEUR: 235,
    avgTransportEUR: 29,
    avgLeisureEUR: 145,
    semesterContributionAvgEUR: 340,
    hasNonEuTuitionFee: false,
    nonEuTuitionPerSemesterEUR: 0,
    partTimeJobMarket: 'EXCELLENT',
    avgStudentHourlyWageEUR: 15.2,
    description:
      "Major global maritime port and aerospace cluster (Airbus). High quality of life with strong demand for international engineering and logistics students.",
    keyUniversities: ['University of Hamburg', 'Hamburg University of Technology (TUHH)', 'HAW Hamburg'],
  },
  {
    id: 'stuttgart',
    name: 'Stuttgart',
    state: 'Baden-Württemberg',
    tier: 'HIGH',
    avgRentWgEUR: 530,
    avgRentDormEUR: 340,
    avgRentStudioEUR: 770,
    avgFoodEUR: 230,
    avgTransportEUR: 30,
    avgLeisureEUR: 135,
    semesterContributionAvgEUR: 210,
    hasNonEuTuitionFee: true,
    nonEuTuitionPerSemesterEUR: 1500,
    partTimeJobMarket: 'EXCELLENT',
    avgStudentHourlyWageEUR: 16.0,
    description:
      'Automotive and advanced manufacturing heartland (Mercedes-Benz, Porsche, Bosch). Note: Baden-Württemberg state mandates €1,500/semester tuition for non-EU students.',
    keyUniversities: ['University of Stuttgart', 'University of Hohenheim', 'Stuttgart Media University (HdM)'],
  },
  {
    id: 'aachen',
    name: 'Aachen',
    state: 'North Rhine-Westphalia',
    tier: 'MODERATE',
    avgRentWgEUR: 420,
    avgRentDormEUR: 290,
    avgRentStudioEUR: 620,
    avgFoodEUR: 210,
    avgTransportEUR: 25,
    avgLeisureEUR: 110,
    semesterContributionAvgEUR: 320,
    hasNonEuTuitionFee: false,
    nonEuTuitionPerSemesterEUR: 0,
    partTimeJobMarket: 'VERY_GOOD',
    avgStudentHourlyWageEUR: 14.5,
    description:
      "Home to elite RWTH Aachen (TU9). Very student-friendly cost of living with world-renowned technical faculties, zero tuition fees, and rich border-triangle industry ties.",
    keyUniversities: ['RWTH Aachen University', 'FH Aachen University of Applied Sciences'],
  },
  {
    id: 'heidelberg',
    name: 'Heidelberg',
    state: 'Baden-Württemberg',
    tier: 'HIGH',
    avgRentWgEUR: 510,
    avgRentDormEUR: 330,
    avgRentStudioEUR: 750,
    avgFoodEUR: 225,
    avgTransportEUR: 29,
    avgLeisureEUR: 130,
    semesterContributionAvgEUR: 175,
    hasNonEuTuitionFee: true,
    nonEuTuitionPerSemesterEUR: 1500,
    partTimeJobMarket: 'GOOD',
    avgStudentHourlyWageEUR: 14.8,
    description:
      "Germany's oldest university (est. 1386) and top biotechnology hub. Picturesque romantic city. Non-EU students pay Baden-Württemberg state tuition of €1,500/semester.",
    keyUniversities: ['Heidelberg University (Ruprecht-Karls-Universität)', 'SRH University Heidelberg'],
  },
  {
    id: 'leipzig',
    name: 'Leipzig',
    state: 'Saxony',
    tier: 'LOW',
    avgRentWgEUR: 360,
    avgRentDormEUR: 260,
    avgRentStudioEUR: 510,
    avgFoodEUR: 195,
    avgTransportEUR: 29,
    avgLeisureEUR: 100,
    semesterContributionAvgEUR: 270,
    hasNonEuTuitionFee: false,
    nonEuTuitionPerSemesterEUR: 0,
    partTimeJobMarket: 'GOOD',
    avgStudentHourlyWageEUR: 13.8,
    description:
      "One of Germany's most affordable, youthful, and fastest-growing student cities. Low rental costs, vibrant arts culture, major logistics hub (DHL Hub), and zero tuition fees.",
    keyUniversities: ['Leipzig University', 'HTWK Leipzig', 'HHL Leipzig Graduate School of Management'],
  },
  {
    id: 'dresden',
    name: 'Dresden',
    state: 'Saxony',
    tier: 'LOW',
    avgRentWgEUR: 370,
    avgRentDormEUR: 270,
    avgRentStudioEUR: 530,
    avgFoodEUR: 200,
    avgTransportEUR: 29,
    avgLeisureEUR: 100,
    semesterContributionAvgEUR: 290,
    hasNonEuTuitionFee: false,
    nonEuTuitionPerSemesterEUR: 0,
    partTimeJobMarket: 'VERY_GOOD',
    avgStudentHourlyWageEUR: 14.0,
    description:
      "Silicon Saxony semiconductor capital (Infineon, Bosch, GlobalFoundries) and home to TU Dresden (TU9). Highly affordable student living with massive engineering opportunities.",
    keyUniversities: ['TU Dresden', 'Dresden University of Applied Sciences (HTW)'],
  },
  {
    id: 'bremen',
    name: 'Bremen',
    state: 'Bremen',
    tier: 'MODERATE',
    avgRentWgEUR: 410,
    avgRentDormEUR: 285,
    avgRentStudioEUR: 590,
    avgFoodEUR: 205,
    avgTransportEUR: 29,
    avgLeisureEUR: 110,
    semesterContributionAvgEUR: 390,
    hasNonEuTuitionFee: false,
    nonEuTuitionPerSemesterEUR: 0,
    partTimeJobMarket: 'GOOD',
    avgStudentHourlyWageEUR: 14.0,
    description:
      "Historic Hanseatic city with strong aerospace, logistics, and marine science clusters. Affordable housing and great public transportation coverage.",
    keyUniversities: ['University of Bremen', 'City University of Applied Sciences (HS Bremen)', 'Constructor University'],
  },
];

export const FINANCIAL_DATA_SOURCES: FinancialDataSourceInfo[] = [
  {
    sourceName: 'DAAD Living Costs in Germany Benchmark (2026)',
    officialPublisher: 'Deutscher Akademischer Austauschdienst (DAAD)',
    publicationYear: 2026,
    lastUpdated: 'January 2026',
    description:
      'Official statistical breakdown of average student living expenses in German university cities, including housing, food, and public transit contributions.',
    officialUrl: 'https://www.daad.de/en/study-and-research-in-germany/plan-your-studies/costs-of-education-and-living/',
  },
  {
    sourceName: 'Deutsches Studierendenwerk (DSW) 22nd Social Survey',
    officialPublisher: 'German Federal Ministry of Education and Research (BMBF) & DSW',
    publicationYear: 2024,
    lastUpdated: 'Official Reference Standard',
    description:
      'Representative survey of student economic and social conditions in Germany, tracking average student rent across shared flats (WG), dormitories, and studios.',
    officialUrl: 'https://www.studierendenwerke.de/en/topics/social-survey',
  },
  {
    sourceName: 'Federal Foreign Office Statutory Sperrkonto Regulation',
    officialPublisher: 'Federal Foreign Office (Auswärtiges Amt)',
    publicationYear: 2026,
    lastUpdated: 'Effective for 2025/2026 Academic Year',
    statutoryReference: 'Aufenthaltsgesetz (AufenthG) § 16b',
    description:
      'Statutory minimum financial requirement for international student visa issuance (€11,904/year or €992/month).',
    officialUrl: 'https://www.auswaertiges-amt.de/en/visa-service/buergerservice/faq/-/606848',
  },
  {
    sourceName: 'GKV-Spitzenverband Statutory Student Health Insurance Tariff',
    officialPublisher: 'National Association of Statutory Health Insurance Funds',
    publicationYear: 2026,
    lastUpdated: 'January 2026',
    description:
      'Standardized statutory student health and long-term nursing care insurance rate applicable to public health funds (TK, AOK, Barmer).',
    officialUrl: 'https://www.gkv-spitzenverband.de/',
  },
  {
    sourceName: 'APS India (Akademische Prüfstelle New Delhi) Fee Schedule',
    officialPublisher: 'German Embassy New Delhi & DAAD India',
    publicationYear: 2026,
    lastUpdated: 'Current Operational Schedule',
    description:
      'Mandatory document evaluation verification fee (₹18,000) for all Indian applicants submitting academic dossiers to German universities.',
    officialUrl: 'https://aps-india.info/',
  },
];
