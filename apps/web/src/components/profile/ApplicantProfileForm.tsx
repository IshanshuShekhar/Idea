import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Compass,
  GraduationCap,
  Languages,
  Award,
  Briefcase,
  BookOpen,
  Wrench,
  DollarSign,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Info,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  Building,
  MapPin,
  Clock,
  Layers,
  HelpCircle,
  Trophy,
  HeartHandshake,
} from 'lucide-react';
import {
  ComprehensiveApplicantProfile,
  ProfileCompletionReport,
  Pathway,
  EntranceExamItem,
  WorkExperienceItem,
  ProfileInternshipItem,
  ProfileProjectItem,
  ProfileDocumentItem,
  SportsAchievementEntry,
  OtherAchievementEntry,
  SectionDisabilityAccessibility,
  Provenance,
} from '@educaro/shared';
import { ProvenanceBadge } from '../ProvenanceBadge';
import { CountryPhoneInput } from '../CountryPhoneInput';

interface Props {
  initialProfile?: ComprehensiveApplicantProfile;
  token?: string | null;
  onProfileUpdated?: (profile: ComprehensiveApplicantProfile) => void;
  standalone?: boolean;
}

const DEFAULT_PROFILE: ComprehensiveApplicantProfile = {
  userId: '',
  status: 'DRAFT',
  isComplete: false,
  completenessScore: 25,
  lastSavedAt: new Date().toISOString(),
  personal: {
    fullName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    nationality: 'Indian',
    countryOfResidence: 'India',
    currentCity: '',
    passportStatus: 'HAVE_PASSPORT',
    passportExpiryDate: '',
    preferredLanguage: 'English',
    currentAddress: '',
    gender: 'PREFER_NOT_TO_SAY',
    genderSelfDescribe: '',
  },
  goals: {
    primaryPathway: Pathway.STUDY,
    secondaryPathway: undefined,
    preferredFieldOrIndustry: 'Computer Science & Artificial Intelligence',
    preferredCitiesOrRegions: ['Munich', 'Berlin', 'Aachen'],
    expectedTimeline: 'Winter Semester 2026/27',
    intendedIntakeYear: '2026',
    readinessStatus: 'PREPARING',
  },
  academic: {
    highestCompletedQualification: 'Bachelor of Technology (B.Tech)',
    currentQualificationStatus: 'COMPLETED',
    currentQualificationName: '',
    degreeName: 'B.Tech in Computer Science',
    streamOrSpecialization: 'Computer Science & Engineering',
    institutionName: '',
    countryOfEducation: 'India',
    graduationYear: 2024,
    gradingScale: '10_POINT',
    scoreValue: 8.5,
    maxGrade: 10,
    minPassingGrade: 4,
    estimatedGermanGrade: 1.75,
    backlogsCount: 0,
    transcriptsAvailable: true,
    degreeCertificateAvailable: true,
    previousEducationHistory: '12th Standard CBSE Science Stream (Physics, Chemistry, Math)',
    academicAchievements: '',
    bachelorTotalCreditsECTS: 180,
    bachelorMathCreditsECTS: 24,
    bachelorCsCreditsECTS: 48,
    hasHigherMath: true,
    hasProgramming: true,
    programmingLanguages: ['Python', 'Java', 'SQL'],
    school12thBoard: 'CBSE',
    school12thPercentage: 88,
    schoolStream: 'Science (PCM)',
    vocationalQualifications: '',
    practicalTrainingExperience: '',
  },
  languages: {
    germanLevel: 'A2',
    germanCertificateAvailable: false,
    germanExamType: 'NONE',
    germanScore: '',
    germanExamDate: '',
    isCurrentlyLearningGerman: true,
    targetGermanLevel: 'B2',
    expectedGermanExamDate: '2026-12-15',
    englishLevel: 'FLUENT',
    englishExamType: 'IELTS',
    englishScore: 7.5,
    englishExamDate: '2025-09-15',
    englishCertificateAvailable: true,
  },
  exams: {
    hasTakenEntranceExams: false,
    exams: [
      {
        id: 'exam-ielts',
        testName: 'IELTS Academic',
        status: 'TAKEN',
        score: '7.5',
        examDate: '2025-09-15',
        certificateAvailable: true,
      },
    ],
  },
  experience: {
    currentEmploymentStatus: 'EMPLOYED',
    totalExperienceYears: 1,
    jobs: [
      {
        id: 'job-1',
        jobTitle: 'Software Engineer',
        employerName: 'Tech Solutions India',
        employmentType: 'FULL_TIME',
        startDate: '2024-07-01',
        endDate: '',
        isCurrent: true,
        responsibilities: 'Developed full stack applications with React and Node.js; collaborated with international clients.',
      },
    ],
    technicalSkills: ['Python', 'JavaScript', 'TypeScript', 'React', 'Docker', 'Git'],
    internships: [],
    projects: [
      {
        id: 'proj-1',
        title: 'Distributed Analytics Platform',
        description: 'Scalable data pipeline handling high-throughput sensor telemetry.',
        technologies: ['Python', 'Docker', 'Kafka'],
        url: 'https://github.com/example/analytics',
      },
    ],
    certifications: [],
    portfolioUrl: '',
    githubUrl: 'https://github.com',
    linkedinUrl: 'https://linkedin.com',
    resumeFileName: '',
    keyAchievements: '',
  },
  studyPrefs: {
    preferredDegreeLevel: 'MASTER',
    preferredSubject: 'Informatics / Data Engineering',
    preferredInstitutions: ['TU Munich (TUM)', 'RWTH Aachen', 'TU Berlin', 'Karlsruhe Institute of Technology (KIT)'],
    preferredStates: ['Bavaria', 'Baden-Württemberg', 'North Rhine-Westphalia', 'Berlin'],
    preferredCities: ['Munich', 'Aachen', 'Berlin', 'Stuttgart'],
    institutionPreference: 'PUBLIC_ONLY',
    teachingLanguagePreference: 'ENGLISH',
    studyMode: 'FULL_TIME',
    desiredStartSemester: 'Winter Semester 2026/27',
    maxTuitionBudgetEUR: 0,
    monthlyLivingBudgetEUR: 992,
    academicEligibilityNotes: 'Interested in tuition-free public universities. Requires APS certification.',
    previousApplications: '',
    preferredCourseDurationSemesters: 4,
  },
  ausbildungPrefs: {
    preferredOccupation: 'Fachinformatiker für Anwendungsentwicklung (Application Developer)',
    preferredIndustry: 'IT & Software Development',
    relevantSchoolQualifications: '12th Standard Science / Vocational IT diploma',
    practicalExperience: 'Hands-on programming projects and internship',
    preferredLocations: ['Munich', 'Hamburg', 'Frankfurt', 'Stuttgart'],
    desiredStartDate: '2026-09-01',
    expectedStipendEUR: 1100,
    vocationalCertifications: 'Python, Git, Web fundamentals',
    existingOffers: '',
  },
  employmentPrefs: {
    targetJobTitle: 'Full Stack Software Engineer',
    targetIndustry: 'Information Technology / Cloud Engineering',
    relevantQualifications: 'B.Tech in Computer Science',
    experienceSummary: '2 years of professional full-stack web and backend engineering',
    preferredLocations: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'],
    expectedSalaryEUR: 65000,
    noticePeriodDays: 30,
    employmentType: 'PERMANENT',
    workAuthorizationStatus: 'NEEDS_SPONSORSHIP',
    existingJobOffers: '',
  },
  financial: {
    annualBudgetEUR: 15000,
    tuitionBudgetEUR: 0,
    monthlyLivingCostEUR: 992,
    financialProofMethod: 'BLOCKED_ACCOUNT',
    interestedInScholarships: true,
    interestedInFunding: true,
    scholarshipPreferences: ['DAAD Study Scholarship', 'Deutschlandstipendium'],
    fundingNeedLevel: 'PARTIAL',
    interestedInTuitionWaiver: true,
    interestedInLivingStipend: true,
    interestedInTravelRelocationGrants: false,
    financialNeedBracket: 'MODERATE',
    academicMeritHighlights: 'Ranked in top 5% of engineering graduating cohort',
    sportsAchievements: 'College athletic meet medalist',
    extracurricularOrVolunteering: 'Mentored underprivileged students in coding clubs',
    sensitiveDataConsent: false,
    needsDisabilityAccommodation: false,
  },
  accessibility: {
    wantsToDisclose: false,
    hasPhysicalDisability: false,
    hasVisualImpairment: false,
    hasHearingImpairment: false,
    hasLearningOrNeurodevelopmental: false,
    hasOtherDisability: false,
    otherDisabilityDescription: '',
    accommodationsRequired: '',
    preferNotToDisclose: true,
    sensitiveDataConsent: false,
  },
  sports: [
    {
      id: 'sport-1',
      sportName: 'Badminton',
      isTeamSport: false,
      competitionLevel: 'COLLEGE',
      yearsOfParticipation: 3,
      competitionName: 'Inter-College State Championship',
      awardsOrMedals: 'Silver Medalist',
      achievementDate: '2023',
      representedEntity: 'College University Team',
      notes: 'Competed at inter-collegiate university level',
    },
  ],
  otherAchievements: [
    {
      id: 'ach-1',
      category: 'ACADEMIC_AWARD',
      title: 'Dean’s Honor List',
      issuerOrOrganization: 'Academic Council',
      achievementDate: '2023',
      description: 'Ranked in top 5 percentile of engineering cohort',
    },
  ],
  documents: {
    documents: [
      { id: 'doc-pass', documentType: 'PASSPORT', title: 'Indian Passport', isMandatory: true, uploadStatus: 'UPLOADED', uploadDate: '2026-09-01', verificationStatus: 'PENDING' },
      { id: 'doc-cv', documentType: 'RESUME_CV', title: 'Curriculum Vitae', isMandatory: true, uploadStatus: 'UPLOADED', uploadDate: '2026-09-05', verificationStatus: 'VERIFIED' },
      { id: 'doc-deg', documentType: 'DEGREE_CERTIFICATE', title: 'Degree Certificate', isMandatory: true, uploadStatus: 'UPLOADED', uploadDate: '2026-09-10', verificationStatus: 'VERIFIED' },
      { id: 'doc-trans', documentType: 'ACADEMIC_TRANSCRIPTS', title: 'Transcripts', isMandatory: true, uploadStatus: 'UPLOADED', uploadDate: '2026-09-10', verificationStatus: 'EXTRACTED' },
      { id: 'doc-ielts', documentType: 'ENTRANCE_EXAM_SCORECARD', title: 'IELTS Scorecard', isMandatory: false, uploadStatus: 'UPLOADED', uploadDate: '2026-09-12', verificationStatus: 'VERIFIED' },
      { id: 'doc-ger', documentType: 'LANGUAGE_CERTIFICATE', title: 'German Certificate', isMandatory: false, uploadStatus: 'MISSING' },
    ],
  },
  previousApps: {
    contactedInstitutions: 'Contacted TUM and RWTH Aachen international student advisory',
    appliedPrograms: 'None submitted yet — finalizing course selection',
    existingOffers: 'None',
    previousRejections: 'None',
    applicationStage: 'PREPARING_DOCUMENTS',
    completedRequirements: ['IELTS 7.5 scorecard obtained', 'Provisional degree issued', 'SOP draft created'],
    outstandingRequirements: ['APS Certificate appointment', 'German A2 certification test', 'Official sealed transcripts'],
    mainChallenges: 'Navigating German credit conversion and APS verification timelines from India',
    assistanceNeeded: ['APS Certificate expediting', 'Course prerequisite mapping', 'Blocked account setup'],
  },
  additional: {
    additionalPreferences: 'Prefer public university campuses located near tech hubs for working student (Werkstudent) opportunities.',
    specialRequirements: '',
    constraints: 'Must join by Winter 2026 semester.',
    additionalNotes: 'Open to dual-degree or English-taught programs with mandatory German language modules.',
  },
};

type StepTabKey =
  | 'personal'
  | 'goals'
  | 'academic'
  | 'languages'
  | 'exams'
  | 'experience'
  | 'pathwayPrefs'
  | 'sports'
  | 'otherAchievements'
  | 'accessibility'
  | 'additional';

interface StepTab {
  key: StepTabKey;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  sectionCode: string;
}

export const ApplicantProfileForm: React.FC<Props> = ({
  initialProfile,
  token,
  onProfileUpdated,
  standalone = false,
}) => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ComprehensiveApplicantProfile>(
    initialProfile || DEFAULT_PROFILE
  );
  const [completion, setCompletion] = useState<ProfileCompletionReport | null>(null);
  const [activeTab, setActiveTab] = useState<StepTabKey>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedMessage, setLastSavedMessage] = useState<string>('');
  const [newSkill, setNewSkill] = useState('');
  const [newCity, setNewCity] = useState('');

  // Bavarian formula live calculation
  const liveGermanGrade = useMemo(() => {
    const score = Number(profile.academic?.scoreValue);
    const scale = profile.academic?.gradingScale || '10_POINT';
    if (!score || isNaN(score)) return null;

    if (scale === 'GERMAN_SCALE') {
      return Number(Math.min(Math.max(score, 1.0), 4.0).toFixed(2));
    }
    let nMax = 10;
    let nMin = 4;
    if (scale === '10_POINT') {
      nMax = Number(profile.academic?.maxGrade) || 10;
      nMin = Number(profile.academic?.minPassingGrade) || 4;
    } else if (scale === 'PERCENTAGE') {
      nMax = 100;
      nMin = 40;
    } else if (scale === '4_POINT') {
      nMax = 4;
      nMin = 2;
    }

    if (nMax <= nMin) return 2.5;
    const clamped = Math.min(Math.max(score, nMin), nMax);
    const val = 1 + 3 * ((nMax - clamped) / (nMax - nMin));
    return Number(Math.min(Math.max(val, 1.0), 4.0).toFixed(2));
  }, [
    profile.academic?.scoreValue,
    profile.academic?.gradingScale,
    profile.academic?.maxGrade,
    profile.academic?.minPassingGrade,
  ]);

  // Load comprehensive profile from API on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/profile/comprehensive', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setProfile((prev) => ({
              ...DEFAULT_PROFILE,
              ...json.data,
              personal: { ...DEFAULT_PROFILE.personal, ...(json.data.personal || {}) },
              goals: { ...DEFAULT_PROFILE.goals, ...(json.data.goals || {}) },
              academic: { ...DEFAULT_PROFILE.academic, ...(json.data.academic || {}) },
              languages: { ...DEFAULT_PROFILE.languages, ...(json.data.languages || {}) },
              exams: { ...DEFAULT_PROFILE.exams, ...(json.data.exams || {}) },
              experience: { ...DEFAULT_PROFILE.experience, ...(json.data.experience || {}) },
              studyPrefs: { ...DEFAULT_PROFILE.studyPrefs, ...(json.data.studyPrefs || {}) },
              ausbildungPrefs: { ...DEFAULT_PROFILE.ausbildungPrefs, ...(json.data.ausbildungPrefs || {}) },
              employmentPrefs: { ...DEFAULT_PROFILE.employmentPrefs, ...(json.data.employmentPrefs || {}) },
              financial: { ...DEFAULT_PROFILE.financial, ...(json.data.financial || {}) },
              accessibility: { ...DEFAULT_PROFILE.accessibility, ...(json.data.accessibility || {}) },
              sports: json.data.sports || DEFAULT_PROFILE.sports || [],
              otherAchievements: json.data.otherAchievements || DEFAULT_PROFILE.otherAchievements || [],
              documents: { ...DEFAULT_PROFILE.documents, ...(json.data.documents || {}) },
              previousApps: { ...DEFAULT_PROFILE.previousApps, ...(json.data.previousApps || {}) },
              additional: { ...DEFAULT_PROFILE.additional, ...(json.data.additional || {}) },
            }));
            if (json.completion) setCompletion(json.completion);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };
    loadProfile();
  }, [token]);

  // Step definitions
  const steps: StepTab[] = useMemo(() => {
    const pathway = profile.goals?.primaryPathway || Pathway.STUDY;
    let pathwayLabel = 'Study Preferences';
    let pathwayShort = 'Study';
    let pathwayIcon = BookOpen;
    let pathwayCode = 'Section G';

    if (pathway === Pathway.VOCATIONAL) {
      pathwayLabel = 'Ausbildung Preferences';
      pathwayShort = 'Ausbildung';
      pathwayIcon = Wrench;
      pathwayCode = 'Section H';
    } else if (pathway === Pathway.EMPLOYMENT) {
      pathwayLabel = 'Employment Preferences';
      pathwayShort = 'Jobs';
      pathwayIcon = Briefcase;
      pathwayCode = 'Section I';
    }

    return [
      { key: 'personal', label: 'Personal Information', shortLabel: 'Personal', icon: User, sectionCode: 'Section A' },
      { key: 'goals', label: 'Pathway & Career Goals', shortLabel: 'Goals', icon: Compass, sectionCode: 'Section B' },
      { key: 'academic', label: 'Academic Background', shortLabel: 'Academic', icon: GraduationCap, sectionCode: 'Section C' },
      { key: 'languages', label: 'Language Proficiency', shortLabel: 'Languages', icon: Languages, sectionCode: 'Section D' },
      { key: 'exams', label: 'Entrance Exams & Tests', shortLabel: 'Exams', icon: Award, sectionCode: 'Section E' },
      { key: 'experience', label: 'Experience & Skills', shortLabel: 'Skills', icon: Briefcase, sectionCode: 'Section F' },
      { key: 'pathwayPrefs', label: pathwayLabel, shortLabel: pathwayShort, icon: pathwayIcon, sectionCode: pathwayCode },
      { key: 'sports', label: 'Sports & Athletic Achievements', shortLabel: 'Sports', icon: Trophy, sectionCode: 'Sports' },
      { key: 'otherAchievements', label: 'Other Achievements & Awards', shortLabel: 'Honors', icon: Award, sectionCode: 'Honors' },
      { key: 'accessibility', label: 'Disability & Accessibility', shortLabel: 'Accessibility', icon: HeartHandshake, sectionCode: 'Accessibility' },
      { key: 'additional', label: 'Additional & Review', shortLabel: 'Review', icon: CheckCircle2, sectionCode: 'Section M' },
    ];
  }, [profile.goals?.primaryPathway]);

  const currentStepIndex = steps.findIndex((s) => s.key === activeTab);

  // Save changes to API
  const handleSave = async (isDraft = true) => {
    setIsSaving(true);
    try {
      const payload = {
        ...profile,
        academic: {
          ...profile.academic,
          estimatedGermanGrade: liveGermanGrade || profile.academic.estimatedGermanGrade,
        },
      };

      if (token) {
        const res = await fetch(`/api/profile/comprehensive?draft=${isDraft}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ data: payload, isDraft }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data) setProfile(json.data);
          if (json.completion) setCompletion(json.completion);
          if (onProfileUpdated && json.data) onProfileUpdated(json.data);
          setLastSavedMessage(
            isDraft
              ? `Draft saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Profile submitted successfully!'
          );
        } else if (!isDraft) {
          // If full completion validation failed, save as draft so all user data is safely preserved
          const fallbackRes = await fetch(`/api/profile/comprehensive?draft=true`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ data: payload, isDraft: true }),
          });
          if (fallbackRes.ok) {
            const fallbackJson = await fallbackRes.json();
            if (fallbackJson.data) setProfile(fallbackJson.data);
            if (fallbackJson.completion) setCompletion(fallbackJson.completion);
            if (onProfileUpdated && fallbackJson.data) onProfileUpdated(fallbackJson.data);
            setLastSavedMessage('Progress saved. Continuing to Documents...');
          }
        }
      } else {
        setLastSavedMessage('Local changes saved');
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
      setLastSavedMessage('Save failed. Please check connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    await handleSave(true);
    if (currentStepIndex < steps.length - 1) {
      setActiveTab(steps[currentStepIndex + 1].key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setActiveTab(steps[currentStepIndex - 1].key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinalSubmit = async () => {
    await handleSave(false);
    navigate('/journey/documents');
  };

  // Updaters
  const updatePersonal = (field: string, val: any) => {
    setProfile((prev) => ({ ...prev, personal: { ...prev.personal, [field]: val } }));
  };
  const updateGoals = (field: string, val: any) => {
    setProfile((prev) => ({ ...prev, goals: { ...prev.goals, [field]: val } }));
  };
  const updateAcademic = (field: string, val: any) => {
    setProfile((prev) => ({ ...prev, academic: { ...prev.academic, [field]: val } }));
  };
  const updateLanguages = (field: string, val: any) => {
    setProfile((prev) => ({ ...prev, languages: { ...prev.languages, [field]: val } }));
  };
  const updateStudy = (field: string, val: any) => {
    setProfile((prev) => ({ ...prev, studyPrefs: { ...prev.studyPrefs, [field]: val } as any }));
  };
  const updateAusbildung = (field: string, val: any) => {
    setProfile((prev) => ({ ...prev, ausbildungPrefs: { ...prev.ausbildungPrefs, [field]: val } as any }));
  };
  const updateEmployment = (field: string, val: any) => {
    setProfile((prev) => ({ ...prev, employmentPrefs: { ...prev.employmentPrefs, [field]: val } as any }));
  };
  const updateFinancial = (field: string, val: any) => {
    setProfile((prev) => ({ ...prev, financial: { ...prev.financial, [field]: val } }));
  };
  const updateAccessibility = (field: keyof SectionDisabilityAccessibility, val: any) => {
    setProfile((prev) => ({
      ...prev,
      accessibility: {
        ...(prev.accessibility || {}),
        [field]: val,
      },
    }));
  };
  const addSportsEntry = () => {
    const newEntry: SportsAchievementEntry = {
      id: `sport-${Date.now()}`,
      sportName: '',
      isTeamSport: false,
      competitionLevel: 'COLLEGE',
      yearsOfParticipation: 1,
      competitionName: '',
      awardsOrMedals: '',
      achievementDate: '',
      representedEntity: '',
      notes: '',
    };
    setProfile((prev) => ({ ...prev, sports: [...(prev.sports || []), newEntry] }));
  };
  const updateSportsEntry = (id: string, field: keyof SportsAchievementEntry, val: any) => {
    setProfile((prev) => ({
      ...prev,
      sports: (prev.sports || []).map((s) => (s.id === id ? { ...s, [field]: val } : s)),
    }));
  };
  const removeSportsEntry = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      sports: (prev.sports || []).filter((s) => s.id !== id),
    }));
  };
  const addOtherAchievementEntry = () => {
    const newEntry: OtherAchievementEntry = {
      id: `ach-${Date.now()}`,
      category: 'ACADEMIC_AWARD',
      title: '',
      issuerOrOrganization: '',
      achievementDate: '',
      description: '',
    };
    setProfile((prev) => ({ ...prev, otherAchievements: [...(prev.otherAchievements || []), newEntry] }));
  };
  const updateOtherAchievementEntry = (id: string, field: keyof OtherAchievementEntry, val: any) => {
    setProfile((prev) => ({
      ...prev,
      otherAchievements: (prev.otherAchievements || []).map((a) => (a.id === id ? { ...a, [field]: val } : a)),
    }));
  };
  const removeOtherAchievementEntry = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      otherAchievements: (prev.otherAchievements || []).filter((a) => a.id !== id),
    }));
  };
  const updatePreviousApps = (field: string, val: any) => {
    setProfile((prev) => ({ ...prev, previousApps: { ...prev.previousApps, [field]: val } }));
  };
  const updateAdditional = (field: string, val: any) => {
    setProfile((prev) => ({ ...prev, additional: { ...prev.additional, [field]: val } }));
  };

  // Skill tags management
  const addSkill = () => {
    if (!newSkill.trim()) return;
    const skills = profile.experience?.technicalSkills || [];
    if (!skills.includes(newSkill.trim())) {
      setProfile((prev) => ({
        ...prev,
        experience: {
          ...prev.experience,
          technicalSkills: [...skills, newSkill.trim()],
        },
      }));
    }
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    setProfile((prev) => ({
      ...prev,
      experience: {
        ...prev.experience,
        technicalSkills: (prev.experience?.technicalSkills || []).filter((s) => s !== skill),
      },
    }));
  };

  // City tags management
  const addCity = () => {
    if (!newCity.trim()) return;
    const cities = profile.goals?.preferredCitiesOrRegions || [];
    if (!cities.includes(newCity.trim())) {
      setProfile((prev) => ({
        ...prev,
        goals: {
          ...prev.goals,
          preferredCitiesOrRegions: [...cities, newCity.trim()],
        },
      }));
    }
    setNewCity('');
  };

  const removeCity = (city: string) => {
    setProfile((prev) => ({
      ...prev,
      goals: {
        ...prev.goals,
        preferredCitiesOrRegions: (prev.goals?.preferredCitiesOrRegions || []).filter((c) => c !== city),
      },
    }));
  };

  // Entrance exam management
  const addExam = () => {
    const newExams = [
      ...(profile.exams?.exams || []),
      {
        id: `exam-${Date.now()}`,
        testName: 'GRE General',
        status: 'PLANNED' as const,
        score: '',
        examDate: '',
        certificateAvailable: false,
      },
    ];
    setProfile((prev) => ({ ...prev, exams: { ...prev.exams, hasTakenEntranceExams: true, exams: newExams } }));
  };

  const updateExam = (id: string, field: keyof EntranceExamItem, val: any) => {
    const newExams = (profile.exams?.exams || []).map((ex) => (ex.id === id ? { ...ex, [field]: val } : ex));
    setProfile((prev) => ({ ...prev, exams: { ...prev.exams, exams: newExams } }));
  };

  const removeExam = (id: string) => {
    const newExams = (profile.exams?.exams || []).filter((ex) => ex.id !== id);
    setProfile((prev) => ({ ...prev, exams: { ...prev.exams, exams: newExams } }));
  };

  // Job experience management
  const addJob = () => {
    const newJobs: WorkExperienceItem[] = [
      ...(profile.experience?.jobs || []),
      {
        id: `job-${Date.now()}`,
        jobTitle: '',
        employerName: '',
        employmentType: 'FULL_TIME',
        startDate: '',
        endDate: '',
        isCurrent: true,
        responsibilities: '',
      },
    ];
    setProfile((prev) => ({ ...prev, experience: { ...prev.experience, jobs: newJobs } }));
  };

  const updateJob = (id: string, field: keyof WorkExperienceItem, val: any) => {
    const newJobs = (profile.experience?.jobs || []).map((j) => (j.id === id ? { ...j, [field]: val } : j));
    setProfile((prev) => ({ ...prev, experience: { ...prev.experience, jobs: newJobs } }));
  };

  const removeJob = (id: string) => {
    const newJobs = (profile.experience?.jobs || []).filter((j) => j.id !== id);
    setProfile((prev) => ({ ...prev, experience: { ...prev.experience, jobs: newJobs } }));
  };

  const progressPct = completion?.overallCompletenessPct || profile.completenessScore || 30;

  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Progress Header */}
      <div className="bg-white rounded-3xl border border-border p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-soft normal-case text-xs font-semibold">
                Single Source of Truth
              </span>
              <ProvenanceBadge
                provenance={Provenance.APPLICANT_PROVIDED}
                sourceText="Direct applicant input"
              />
              {profile.status === 'COMPLETED' && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Profile Completed
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Comprehensive Applicant Profile
            </h1>
            <p className="text-xs text-gray-600 max-w-2xl mt-0.5">
              Enter your details once. All recommendations, APS qualification assessments, CV exports, and
              admissions matching automatically reuse your verified profile data.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="btn-secondary text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5 font-semibold"
            >
              <Save className="w-3.5 h-3.5 text-gray-600" />
              <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleFinalSubmit()}
              className="btn-brand text-white text-xs px-5 py-2 rounded-xl inline-flex items-center gap-1.5 font-semibold shadow-xs"
            >
              <span>Complete & Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Status */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-800">
              Profile Completeness: <strong className="text-brand">{progressPct}%</strong>
            </span>
            <span className="text-gray-500 text-[11px]">
              {lastSavedMessage || `Pathway: ${profile.goals?.primaryPathway || 'Study'}`}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-brand h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Horizontal Step Tabs */}
      <div className="bg-white rounded-2xl border border-border p-2 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {steps.map((st) => {
            const Icon = st.icon;
            const isActive = activeTab === st.key;
            return (
              <button
                key={st.key}
                type="button"
                onClick={() => {
                  setActiveTab(st.key);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{st.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Body */}
      <div className="bg-white rounded-3xl border border-border p-6 sm:p-8 shadow-xs">
        {/* ==================================================================== */}
        {/* SECTION A: PERSONAL INFORMATION */}
        {/* ==================================================================== */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                Section A
              </span>
              <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
              <p className="text-xs text-gray-600">
                Official applicant identity as recorded on your Indian Passport and official transcripts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Full Legal Name (as per Passport) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.personal?.fullName || ''}
                  onChange={(e) => updatePersonal('fullName', e.target.value)}
                  placeholder="e.g. Ishan Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={profile.personal?.dateOfBirth || ''}
                  onChange={(e) => updatePersonal('dateOfBirth', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={profile.personal?.email || ''}
                  onChange={(e) => updatePersonal('email', e.target.value)}
                  placeholder="e.g. ishan.sharma@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Phone Number (with Country Code) <span className="text-red-500">*</span>
                </label>
                <CountryPhoneInput
                  value={profile.personal?.phone || ''}
                  onChange={(val) => updatePersonal('phone', val)}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nationality <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.personal?.nationality || 'Indian'}
                  onChange={(e) => updatePersonal('nationality', e.target.value)}
                  placeholder="Indian"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Current Country of Residence <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.personal?.countryOfResidence || 'India'}
                  onChange={(e) => updatePersonal('countryOfResidence', e.target.value)}
                  placeholder="India"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Current City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.personal?.currentCity || ''}
                  onChange={(e) => updatePersonal('currentCity', e.target.value)}
                  placeholder="e.g. Bangalore, Pune, Delhi, Mumbai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Preferred Contact Language
                </label>
                <select
                  value={profile.personal?.preferredLanguage || 'English'}
                  onChange={(e) => updatePersonal('preferredLanguage', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="English">English</option>
                  <option value="Hindi">हिन्दी (Hindi)</option>
                  <option value="German">Deutsch (German)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Passport Availability
                </label>
                <select
                  value={profile.personal?.passportStatus || 'HAVE_PASSPORT'}
                  onChange={(e) => updatePersonal('passportStatus', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="HAVE_PASSPORT">Yes, I have a valid passport</option>
                  <option value="APPLIED">Applied / Renewal in progress</option>
                  <option value="NO_PASSPORT">Not yet applied</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Passport Validity Expiry Date
                </label>
                <input
                  type="date"
                  value={profile.personal?.passportExpiryDate || ''}
                  onChange={(e) => updatePersonal('passportExpiryDate', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Gender (Optional for Specialized Scholarships)
                </label>
                <select
                  value={profile.personal?.gender || 'PREFER_NOT_TO_SAY'}
                  onChange={(e) => updatePersonal('gender', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  <option value="WOMAN">Woman (Eligible for DAAD Women in STEM & dedicated grants)</option>
                  <option value="MAN">Man</option>
                  <option value="NON_BINARY">Non-binary</option>
                  <option value="SELF_DESCRIBE">Self-describe</option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  Used solely for specialized scholarship eligibility (e.g. Women in STEM). Non-disclosure will never affect your general admission score.
                </p>
              </div>

              {profile.personal?.gender === 'SELF_DESCRIBE' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Self-Described Gender
                  </label>
                  <input
                    type="text"
                    value={profile.personal?.genderSelfDescribe || ''}
                    onChange={(e) => updatePersonal('genderSelfDescribe', e.target.value)}
                    placeholder="Describe your gender"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Current Residential Address (Optional)
              </label>
              <textarea
                rows={2}
                value={profile.personal?.currentAddress || ''}
                onChange={(e) => updatePersonal('currentAddress', e.target.value)}
                placeholder="House / Flat No., Street, Area, Pincode"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION B: CAREER OR EDUCATION GOAL */}
        {/* ==================================================================== */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                Section B
              </span>
              <h2 className="text-xl font-bold text-gray-900">Career & Education Goals</h2>
              <p className="text-xs text-gray-600">
                Choose your primary aspiration in Germany. Sections G, H, or I will adapt to your choice.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Primary Pathway <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    key: Pathway.STUDY,
                    title: "University Study",
                    desc: "Master's or Bachelor's degrees at public tuition-free universities.",
                    icon: GraduationCap,
                  },
                  {
                    key: Pathway.VOCATIONAL,
                    title: 'Dual Vocational Training',
                    desc: 'Work + study with monthly stipend (~€1,100/mo). No tuition fees.',
                    icon: Wrench,
                  },
                  {
                    key: Pathway.EMPLOYMENT,
                    title: 'Skilled Direct Employment',
                    desc: 'EU Blue Card or Chancenkarte Opportunity Card jobs in Germany.',
                    icon: Briefcase,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = profile.goals?.primaryPathway === item.key;
                  return (
                    <div
                      key={item.key}
                      onClick={() => updateGoals('primaryPathway', item.key)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-brand bg-brand/5 ring-2 ring-brand/20'
                          : 'border-border bg-gray-50/50 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-brand' : 'text-gray-500'}`} />
                        {isSelected && <Check className="w-4 h-4 text-brand" />}
                      </div>
                      <h4 className="font-bold text-sm text-gray-900">{item.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Preferred Field or Industry <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.goals?.preferredFieldOrIndustry || ''}
                  onChange={(e) => updateGoals('preferredFieldOrIndustry', e.target.value)}
                  placeholder="e.g. Computer Science, Mechanical Engineering, Healthcare"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Expected Timeline / Intake Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={profile.goals?.expectedTimeline || 'Winter Semester 2026/27'}
                  onChange={(e) => {
                    updateGoals('expectedTimeline', e.target.value);
                    if (e.target.value.includes('2026')) updateGoals('intendedIntakeYear', '2026');
                    if (e.target.value.includes('2027')) updateGoals('intendedIntakeYear', '2027');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="Winter Semester 2026/27">Winter Semester 2026/27 (Starts Oct 2026)</option>
                  <option value="Summer Semester 2027">Summer Semester 2027 (Starts Apr 2027)</option>
                  <option value="Winter Semester 2027/28">Winter Semester 2027/28 (Starts Oct 2027)</option>
                  <option value="Immediate / As soon as eligible">Immediate / As soon as eligible</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Preferred German Cities / Regions
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(profile.goals?.preferredCitiesOrRegions || []).map((city) => (
                  <span
                    key={city}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold"
                  >
                    <span>{city}</span>
                    <button
                      type="button"
                      onClick={() => removeCity(city)}
                      className="hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCity();
                    }
                  }}
                  placeholder="Add a German city (e.g. Munich, Berlin, Aachen, Stuttgart)..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={addCity}
                  className="btn-secondary text-xs px-3 py-2 rounded-xl"
                >
                  Add City
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Readiness Stage <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'EXPLORING', label: 'Exploring Options', desc: 'Researching universities and requirements' },
                  { key: 'PREPARING', label: 'Preparing Documents', desc: 'Preparing IELTS, German, and APS' },
                  { key: 'READY_TO_APPLY', label: 'Ready to Apply Now', desc: 'Have all documents ready to submit' },
                ].map((st) => (
                  <label
                    key={st.key}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${
                      profile.goals?.readinessStatus === st.key
                        ? 'border-brand bg-brand/5 text-gray-900'
                        : 'border-border text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="readinessStatus"
                      checked={profile.goals?.readinessStatus === st.key}
                      onChange={() => updateGoals('readinessStatus', st.key)}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-xs font-bold">{st.label}</div>
                      <div className="text-[11px] text-gray-500">{st.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION C: ACADEMIC BACKGROUND */}
        {/* ==================================================================== */}
        {activeTab === 'academic' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Section C
                </span>
                <h2 className="text-xl font-bold text-gray-900">Academic Background</h2>
                <p className="text-xs text-gray-600">
                  Degree credentials, grading scale, credit prerequisites, and live Bavarian formula grade.
                </p>
              </div>

              {/* Bavarian Grade Preview Badge */}
              {liveGermanGrade && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 shrink-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    {liveGermanGrade}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      Bavarian Formula Grade
                    </span>
                    <p className="text-xs font-semibold text-emerald-950">
                      {liveGermanGrade <= 1.5
                        ? 'Sehr Gut (Very Good)'
                        : liveGermanGrade <= 2.5
                        ? 'Gut (Good)'
                        : liveGermanGrade <= 3.5
                        ? 'Befriedigend (Satisfactory)'
                        : 'Ausreichend (Sufficient)'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Highest Completed Qualification <span className="text-red-500">*</span>
                </label>
                <select
                  value={profile.academic?.highestCompletedQualification || 'Bachelor of Technology (B.Tech)'}
                  onChange={(e) => updateAcademic('highestCompletedQualification', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="Bachelor of Technology (B.Tech)">Bachelor of Technology (B.Tech)</option>
                  <option value="Bachelor of Engineering (B.E.)">Bachelor of Engineering (B.E.)</option>
                  <option value="Bachelor of Science (B.Sc)">Bachelor of Science (B.Sc)</option>
                  <option value="Bachelor of Computer Applications (BCA)">Bachelor of Computer Applications (BCA)</option>
                  <option value="Bachelor of Commerce (B.Com)">Bachelor of Commerce (B.Com)</option>
                  <option value="Bachelor of Business Administration (BBA)">Bachelor of Business Administration (BBA)</option>
                  <option value="Master of Science (M.Sc) / M.Tech">Master&apos;s Degree (M.Sc / M.Tech / MCA)</option>
                  <option value="12th Standard / Higher Secondary">12th Standard / Higher Secondary (School)</option>
                  <option value="Diploma / Vocational Polytechnic">Diploma / Vocational Polytechnic</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Degree / Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.academic?.degreeName || ''}
                  onChange={(e) => updateAcademic('degreeName', e.target.value)}
                  placeholder="e.g. B.Tech in Computer Science & Engineering"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Stream / Specialization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.academic?.streamOrSpecialization || ''}
                  onChange={(e) => updateAcademic('streamOrSpecialization', e.target.value)}
                  placeholder="e.g. Information Technology, Mechanical, Electrical"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  College / University Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profile.academic?.institutionName || ''}
                  onChange={(e) => updateAcademic('institutionName', e.target.value)}
                  placeholder="e.g. Anna University, VTU, Delhi University"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Graduation Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={profile.academic?.graduationYear || 2024}
                  onChange={(e) => updateAcademic('graduationYear', Number(e.target.value))}
                  min={1990}
                  max={2030}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Grading Scale <span className="text-red-500">*</span>
                </label>
                <select
                  value={profile.academic?.gradingScale || '10_POINT'}
                  onChange={(e) => updateAcademic('gradingScale', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="10_POINT">10-Point CGPA (e.g. 8.5 / 10)</option>
                  <option value="PERCENTAGE">Percentage % (e.g. 78%)</option>
                  <option value="4_POINT">4-Point GPA (e.g. 3.4 / 4)</option>
                  <option value="GERMAN_SCALE">German Scale 1.0 – 4.0</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Score / CGPA / Percentage <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={profile.academic?.scoreValue || ''}
                  onChange={(e) => updateAcademic('scoreValue', parseFloat(e.target.value))}
                  placeholder="e.g. 8.5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Backlogs / Pending Subjects Count
                </label>
                <input
                  type="number"
                  value={profile.academic?.backlogsCount || 0}
                  onChange={(e) => updateAcademic('backlogsCount', Number(e.target.value))}
                  min={0}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            {/* Document Checkbox Availability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-border">
              <label className="flex items-center gap-2.5 text-xs text-gray-800 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.academic?.transcriptsAvailable ?? true}
                  onChange={(e) => updateAcademic('transcriptsAvailable', e.target.checked)}
                  className="rounded text-brand"
                />
                <span>Academic Transcripts (All Semesters) Available</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-gray-800 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.academic?.degreeCertificateAvailable ?? true}
                  onChange={(e) => updateAcademic('degreeCertificateAvailable', e.target.checked)}
                  className="rounded text-brand"
                />
                <span>Degree Certificate / Provisional Certificate Available</span>
              </label>
            </div>

            {/* Master's Specific ECTS & Credit Prerequisites */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <GraduationCap className="w-4 h-4 text-blue-700" />
                <span>German ECTS Prerequisite Mapping (Crucial for Master&apos;s Programs)</span>
              </div>
              <p className="text-[11px] text-blue-800">
                German universities strictly evaluate bachelor credit hours (ECTS) in Theoretical Computer Science and Mathematics.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Total Bachelor ECTS Credits
                  </label>
                  <input
                    type="number"
                    value={profile.academic?.bachelorTotalCreditsECTS || 180}
                    onChange={(e) => updateAcademic('bachelorTotalCreditsECTS', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Math / Discrete Math ECTS Credits
                  </label>
                  <input
                    type="number"
                    value={profile.academic?.bachelorMathCreditsECTS || 24}
                    onChange={(e) => updateAcademic('bachelorMathCreditsECTS', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Core CS / Engineering ECTS Credits
                  </label>
                  <input
                    type="number"
                    value={profile.academic?.bachelorCsCreditsECTS || 48}
                    onChange={(e) => updateAcademic('bachelorCsCreditsECTS', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* School Education Background */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  12th Standard Board
                </label>
                <input
                  type="text"
                  value={profile.academic?.school12thBoard || 'CBSE'}
                  onChange={(e) => updateAcademic('school12thBoard', e.target.value)}
                  placeholder="e.g. CBSE, ICSE, State Board"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  12th Standard Percentage (%)
                </label>
                <input
                  type="number"
                  value={profile.academic?.school12thPercentage || 88}
                  onChange={(e) => updateAcademic('school12thPercentage', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  12th Stream
                </label>
                <input
                  type="text"
                  value={profile.academic?.schoolStream || 'Science (PCM)'}
                  onChange={(e) => updateAcademic('schoolStream', e.target.value)}
                  placeholder="e.g. Science (PCM), Commerce"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION D: LANGUAGE PROFICIENCY */}
        {/* ==================================================================== */}
        {activeTab === 'languages' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                Section D
              </span>
              <h2 className="text-xl font-bold text-gray-900">Language Proficiency</h2>
              <p className="text-xs text-gray-600">
                German (CEFR A1–C2) and English proficiency details. German knowledge is not required for all English-taught programs.
              </p>
            </div>

            {/* German Section */}
            <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-amber-700" />
                  <h3 className="text-sm font-bold text-gray-900">German Language Proficiency</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  CEFR Standard
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Current German CEFR Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={profile.languages?.germanLevel || 'NONE'}
                    onChange={(e) => updateLanguages('germanLevel', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                  >
                    <option value="NONE">Not started yet (No German knowledge)</option>
                    <option value="A1">A1 — Beginner</option>
                    <option value="A2">A2 — Elementary</option>
                    <option value="B1">B1 — Intermediate (Key milestone for jobs/visas)</option>
                    <option value="B2">B2 — Upper Intermediate (Required for Ausbildung/German-taught)</option>
                    <option value="C1">C1 — Advanced</option>
                    <option value="C2">C2 — Mastery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    German Official Examination Type
                  </label>
                  <select
                    value={profile.languages?.germanExamType || 'NONE'}
                    onChange={(e) => updateLanguages('germanExamType', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                  >
                    <option value="NONE">None / Self-Learner</option>
                    <option value="GOETHE">Goethe-Zertifikat</option>
                    <option value="TESTDAF">TestDaF</option>
                    <option value="TELC">telc Deutsch</option>
                    <option value="OSD">ÖSD</option>
                    <option value="OTHER">Other Official Exam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Target German Level
                  </label>
                  <select
                    value={profile.languages?.targetGermanLevel || 'B2'}
                    onChange={(e) => updateLanguages('targetGermanLevel', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                  >
                    <option value="A2">A2 (Basic everyday conversation)</option>
                    <option value="B1">B1 (Sufficient for most English-taught student life)</option>
                    <option value="B2">B2 (Professional fluency & Ausbildung)</option>
                    <option value="C1">C1 (Full university academic fluency)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Expected German Exam Date
                  </label>
                  <input
                    type="date"
                    value={profile.languages?.expectedGermanExamDate || ''}
                    onChange={(e) => updateLanguages('expectedGermanExamDate', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.languages?.isCurrentlyLearningGerman ?? true}
                    onChange={(e) => updateLanguages('isCurrentlyLearningGerman', e.target.checked)}
                    className="rounded text-brand"
                  />
                  <span>Currently actively learning German</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.languages?.germanCertificateAvailable ?? false}
                    onChange={(e) => updateLanguages('germanCertificateAvailable', e.target.checked)}
                    className="rounded text-brand"
                  />
                  <span>Have official German certificate</span>
                </label>
              </div>
            </div>

            {/* English Section */}
            <div className="p-5 rounded-2xl bg-blue-50/40 border border-blue-200/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-blue-700" />
                  <h3 className="text-sm font-bold text-gray-900">English Language Proficiency</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Global Academic Standard
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    English CEFR Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={profile.languages?.englishLevel || 'FLUENT'}
                    onChange={(e) => updateLanguages('englishLevel', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                  >
                    <option value="NATIVE">Native / Bilingual</option>
                    <option value="FLUENT">Fluent (C1 Level)</option>
                    <option value="INTERMEDIATE">Intermediate (B2 Level)</option>
                    <option value="BASIC">Basic (B1 Level)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    English Test Type
                  </label>
                  <select
                    value={profile.languages?.englishExamType || 'IELTS'}
                    onChange={(e) => updateLanguages('englishExamType', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                  >
                    <option value="IELTS">IELTS Academic</option>
                    <option value="TOEFL">TOEFL iBT</option>
                    <option value="PTE">PTE Academic</option>
                    <option value="DUOLINGO">Duolingo English Test (DET)</option>
                    <option value="MOI">Medium of Instruction (MOI) Certificate</option>
                    <option value="NONE">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Score / Overall Band
                  </label>
                  <input
                    type="text"
                    value={profile.languages?.englishScore || ''}
                    onChange={(e) => updateLanguages('englishScore', e.target.value)}
                    placeholder="e.g. 7.5 or 100"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION E: ENTRANCE EXAMS AND QUALIFICATIONS */}
        {/* ==================================================================== */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Section E
                </span>
                <h2 className="text-xl font-bold text-gray-900">Entrance Exams & Qualifications</h2>
                <p className="text-xs text-gray-600">
                  Standardized test records (IELTS, TOEFL, GRE, GMAT, TestAS, GATE, etc.).
                </p>
              </div>

              <button
                type="button"
                onClick={addExam}
                className="btn-brand text-white text-xs px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Test</span>
              </button>
            </div>

            <div className="space-y-3">
              {(profile.exams?.exams || []).map((exam, idx) => (
                <div
                  key={exam.id || idx}
                  className="p-4 rounded-2xl border border-border bg-gray-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Exam #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeExam(exam.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                        Test Name
                      </label>
                      <input
                        type="text"
                        value={exam.testName}
                        onChange={(e) => updateExam(exam.id, 'testName', e.target.value)}
                        placeholder="e.g. GRE General, TestAS"
                        className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                        Status
                      </label>
                      <select
                        value={exam.status}
                        onChange={(e) => updateExam(exam.id, 'status', e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white"
                      >
                        <option value="TAKEN">Taken (Results Available)</option>
                        <option value="REGISTERED">Registered / Scheduled</option>
                        <option value="PLANNED">Planning to Take</option>
                        <option value="NOT_APPLICABLE">Not Applicable</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                        Score / Result
                      </label>
                      <input
                        type="text"
                        value={exam.score || ''}
                        onChange={(e) => updateExam(exam.id, 'score', e.target.value)}
                        placeholder="e.g. 320 / 340 or 7.5"
                        className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                        Test Date / Planned Date
                      </label>
                      <input
                        type="date"
                        value={exam.examDate || ''}
                        onChange={(e) => updateExam(exam.id, 'examDate', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {(!profile.exams?.exams || profile.exams.exams.length === 0) && (
                <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-border">
                  No entrance exams added yet. Click &quot;Add Test&quot; if you have taken or planned tests like IELTS, GRE, or TestAS.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION F: WORK EXPERIENCE AND SKILLS */}
        {/* ==================================================================== */}
        {activeTab === 'experience' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Section F
                </span>
                <h2 className="text-xl font-bold text-gray-900">Work Experience & Skills</h2>
                <p className="text-xs text-gray-600">
                  Employment history, technical skills, practical internships, and portfolio URLs.
                </p>
              </div>

              <button
                type="button"
                onClick={addJob}
                className="btn-brand text-white text-xs px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Job</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Current Employment Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={profile.experience?.currentEmploymentStatus || 'EMPLOYED'}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      experience: { ...prev.experience, currentEmploymentStatus: e.target.value as any },
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="EMPLOYED">Employed</option>
                  <option value="UNEMPLOYED">Seeking Employment</option>
                  <option value="STUDENT">Student</option>
                  <option value="FREELANCER">Freelancer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Total Work Experience (Years) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={profile.experience?.totalExperienceYears || 0}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      experience: { ...prev.experience, totalExperienceYears: parseFloat(e.target.value) || 0 },
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Professional Experience
              </h4>
              {(profile.experience?.jobs || []).map((job, idx) => (
                <div
                  key={job.id || idx}
                  className="p-4 rounded-2xl border border-border bg-gray-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">Position #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeJob(job.id)}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={job.jobTitle}
                        onChange={(e) => updateJob(job.id, 'jobTitle', e.target.value)}
                        placeholder="e.g. Software Engineer"
                        className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                        Employer / Company
                      </label>
                      <input
                        type="text"
                        value={job.employerName}
                        onChange={(e) => updateJob(job.id, 'employerName', e.target.value)}
                        placeholder="e.g. Infosys, TCS, Startup"
                        className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                      Key Responsibilities & Technologies
                    </label>
                    <textarea
                      rows={2}
                      value={job.responsibilities || ''}
                      onChange={(e) => updateJob(job.id, 'responsibilities', e.target.value)}
                      placeholder="Summary of responsibilities and achievements..."
                      className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Technical Skills Chips */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Technical & Professional Skills <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(profile.experience?.technicalSkills || []).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Type a skill (e.g. Python, Docker, Spring Boot, CAD, Nursing) and press Enter..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-border text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="btn-secondary text-xs px-4 py-2 rounded-xl font-semibold"
                >
                  Add Skill
                </button>
              </div>
            </div>

            {/* Professional URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  value={profile.experience?.githubUrl || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      experience: { ...prev.experience, githubUrl: e.target.value },
                    }))
                  }
                  placeholder="https://github.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={profile.experience?.linkedinUrl || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      experience: { ...prev.experience, linkedinUrl: e.target.value },
                    }))
                  }
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Portfolio / Website URL
                </label>
                <input
                  type="url"
                  value={profile.experience?.portfolioUrl || ''}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      experience: { ...prev.experience, portfolioUrl: e.target.value },
                    }))
                  }
                  placeholder="https://myportfolio.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* SECTION G / H / I: PATHWAY PREFERENCES */}
        {/* ==================================================================== */}
        {activeTab === 'pathwayPrefs' && (
          <div className="space-y-6">
            {/* STUDY PREFERENCES (Section G) */}
            {profile.goals?.primaryPathway === Pathway.STUDY && (
              <div className="space-y-5">
                <div className="border-b border-border pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                    Section G
                  </span>
                  <h2 className="text-xl font-bold text-gray-900">Study Preferences in Germany</h2>
                  <p className="text-xs text-gray-600">
                    Preferences for German university applications (Public/Private, Teaching Language, Semesters).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Preferred Degree Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={profile.studyPrefs?.preferredDegreeLevel || 'MASTER'}
                      onChange={(e) => updateStudy('preferredDegreeLevel', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                    >
                      <option value="MASTER">Master&apos;s Degree (M.Sc / M.Eng / MBA)</option>
                      <option value="BACHELOR">Bachelor&apos;s Degree (B.Sc / B.Eng)</option>
                      <option value="PHD">PhD / Doctorate Research</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Preferred Subject / Specialization <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.studyPrefs?.preferredSubject || ''}
                      onChange={(e) => updateStudy('preferredSubject', e.target.value)}
                      placeholder="e.g. Data Engineering, Robotics, Renewable Energy"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Institution Type Preference <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={profile.studyPrefs?.institutionPreference || 'PUBLIC_ONLY'}
                      onChange={(e) => updateStudy('institutionPreference', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                    >
                      <option value="PUBLIC_ONLY">Public Tuition-Free Universities Only</option>
                      <option value="PRIVATE_ACCEPTED">Private Universities Accepted</option>
                      <option value="EITHER">Either (Best fit program)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Teaching Language Preference <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={profile.studyPrefs?.teachingLanguagePreference || 'ENGLISH'}
                      onChange={(e) => updateStudy('teachingLanguagePreference', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                    >
                      <option value="ENGLISH">100% English-Taught</option>
                      <option value="GERMAN">German-Taught (Requires B2/C1)</option>
                      <option value="BILINGUAL">Bilingual (English + German)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Maximum Annual Tuition Budget (€ EUR)
                    </label>
                    <input
                      type="number"
                      value={profile.studyPrefs?.maxTuitionBudgetEUR ?? 0}
                      onChange={(e) => updateStudy('maxTuitionBudgetEUR', Number(e.target.value))}
                      placeholder="0 for tuition-free public universities"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Monthly Living Cost Budget (€ EUR)
                    </label>
                    <input
                      type="number"
                      value={profile.studyPrefs?.monthlyLivingBudgetEUR || 992}
                      onChange={(e) => updateStudy('monthlyLivingBudgetEUR', Number(e.target.value))}
                      placeholder="992 (Official German Blocked Account standard)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Target German Universities
                  </label>
                  <input
                    type="text"
                    value={(profile.studyPrefs?.preferredInstitutions || []).join(', ')}
                    onChange={(e) =>
                      updateStudy(
                        'preferredInstitutions',
                        e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="e.g. TU Munich, RWTH Aachen, TU Berlin, KIT, Uni Stuttgart"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
            )}

            {/* AUSBILDUNG PREFERENCES (Section H) */}
            {profile.goals?.primaryPathway === Pathway.VOCATIONAL && (
              <div className="space-y-5">
                <div className="border-b border-border pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                    Section H
                  </span>
                  <h2 className="text-xl font-bold text-gray-900">Ausbildung (Vocational) Preferences</h2>
                  <p className="text-xs text-gray-600">
                    Dual vocational training tracks with paid practical training and state certification.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Target Ausbildung Occupation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.ausbildungPrefs?.preferredOccupation || ''}
                      onChange={(e) => updateAusbildung('preferredOccupation', e.target.value)}
                      placeholder="e.g. Fachinformatiker, Pflegefachkraft (Nursing), Mechatroniker"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Preferred Industry <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.ausbildungPrefs?.preferredIndustry || ''}
                      onChange={(e) => updateAusbildung('preferredIndustry', e.target.value)}
                      placeholder="e.g. Information Technology, Healthcare, Automotive"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Desired Start Date
                    </label>
                    <input
                      type="date"
                      value={profile.ausbildungPrefs?.desiredStartDate || ''}
                      onChange={(e) => updateAusbildung('desiredStartDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Monthly Stipend Expectation (€ EUR)
                    </label>
                    <input
                      type="number"
                      value={profile.ausbildungPrefs?.expectedStipendEUR || 1100}
                      onChange={(e) => updateAusbildung('expectedStipendEUR', Number(e.target.value))}
                      placeholder="e.g. 1100"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Relevant Practical Experience & Workshop Training
                  </label>
                  <textarea
                    rows={2}
                    value={profile.ausbildungPrefs?.practicalExperience || ''}
                    onChange={(e) => updateAusbildung('practicalExperience', e.target.value)}
                    placeholder="Describe any hands-on workshop, diploma labs, or vocational experience..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
            )}

            {/* EMPLOYMENT PREFERENCES (Section I) */}
            {profile.goals?.primaryPathway === Pathway.EMPLOYMENT && (
              <div className="space-y-5">
                <div className="border-b border-border pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                    Section I
                  </span>
                  <h2 className="text-xl font-bold text-gray-900">Direct Employment Preferences</h2>
                  <p className="text-xs text-gray-600">
                    Preferences for EU Blue Card, Chancenkarte, and direct German employment sponsorships.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Target Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.employmentPrefs?.targetJobTitle || ''}
                      onChange={(e) => updateEmployment('targetJobTitle', e.target.value)}
                      placeholder="e.g. Cloud DevOps Engineer, Full Stack Developer"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Target Industry <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.employmentPrefs?.targetIndustry || ''}
                      onChange={(e) => updateEmployment('targetIndustry', e.target.value)}
                      placeholder="e.g. IT, FinTech, Automotive Engineering"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Target Gross Annual Salary (€ EUR)
                    </label>
                    <input
                      type="number"
                      value={profile.employmentPrefs?.expectedSalaryEUR || 65000}
                      onChange={(e) => updateEmployment('expectedSalaryEUR', Number(e.target.value))}
                      placeholder="e.g. 65000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Notice Period (Days)
                    </label>
                    <select
                      value={profile.employmentPrefs?.noticePeriodDays || 30}
                      onChange={(e) => updateEmployment('noticePeriodDays', Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                    >
                      <option value={0}>Immediate (0 days)</option>
                      <option value={15}>15 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Work Authorization / Visa Status
                    </label>
                    <select
                      value={profile.employmentPrefs?.workAuthorizationStatus || 'NEEDS_SPONSORSHIP'}
                      onChange={(e) => updateEmployment('workAuthorizationStatus', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                    >
                      <option value="NEEDS_SPONSORSHIP">Needs German Work Visa / Blue Card Sponsorship</option>
                      <option value="CHANCENKARTE">Chancenkarte (Opportunity Card) Holder / Applicant</option>
                      <option value="STUDENT_VISA">Student Visa with 140 full days work rights</option>
                      <option value="EU_CITIZEN">EU Citizen / Permanent Resident</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SPORTS & ATHLETIC ACHIEVEMENTS */}
        {/* ==================================================================== */}
        {activeTab === 'sports' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Athletics & Squad Participation
                </span>
                <h2 className="text-xl font-bold text-gray-900">Sports & Athletic Achievements</h2>
                <p className="text-xs text-gray-600">
                  Record official tournament, state, national, university, or recreational sports accomplishments.
                </p>
              </div>

              <button
                type="button"
                onClick={addSportsEntry}
                className="btn-brand text-white text-xs px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Add Sport Achievement</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-brand/5 border border-brand/20 text-xs text-gray-700 flex items-start gap-3">
              <Trophy className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Elite Squad Scholarship Matching (adh)</p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  The German University Sports Federation (Allgemeiner Deutscher Hochschulsportverband - adh) and German state universities offer athletic scholarships and special study-contract quotas for athletes with certified State, National, or International squad participation.
                </p>
              </div>
            </div>

            {(!profile.sports || profile.sports.length === 0) ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-2xl bg-gray-50/50">
                <Trophy className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-gray-700">No sports achievements added yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                  If you have competed in athletics, badminton, cricket, football, swimming, or other sports at any level, add them here for athletic scholarship matching.
                </p>
                <button
                  type="button"
                  onClick={addSportsEntry}
                  className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover inline-flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Sports Entry</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {profile.sports.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="p-5 rounded-2xl border border-border bg-white shadow-sm space-y-4 relative"
                  >
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-gray-900 text-sm">
                          {entry.sportName || 'Unnamed Sport'}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                          {entry.competitionLevel || 'COLLEGE'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSportsEntry(entry.id)}
                        className="text-gray-400 hover:text-red-600 transition p-1"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Sport Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={entry.sportName}
                          onChange={(e) => updateSportsEntry(entry.id, 'sportName', e.target.value)}
                          placeholder="e.g. Badminton, Athletics, Football, Chess"
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Competition Level <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={entry.competitionLevel}
                          onChange={(e) => updateSportsEntry(entry.id, 'competitionLevel', e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white focus:ring-2 focus:ring-brand"
                        >
                          <option value="RECREATIONAL">Recreational / Club</option>
                          <option value="SCHOOL">School Level</option>
                          <option value="COLLEGE">Inter-College / Departmental</option>
                          <option value="UNIVERSITY">All-India Inter-University</option>
                          <option value="STATE">State Level / State Federation Squad</option>
                          <option value="NATIONAL">National Squad / National Games</option>
                          <option value="INTERNATIONAL">International Representative</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Participation Type
                        </label>
                        <select
                          value={entry.isTeamSport ? 'TEAM' : 'INDIVIDUAL'}
                          onChange={(e) => updateSportsEntry(entry.id, 'isTeamSport', e.target.value === 'TEAM')}
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white focus:ring-2 focus:ring-brand"
                        >
                          <option value="INDIVIDUAL">Individual Sport</option>
                          <option value="TEAM">Team Sport</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Tournament / Competition Name
                        </label>
                        <input
                          type="text"
                          value={entry.competitionName || ''}
                          onChange={(e) => updateSportsEntry(entry.id, 'competitionName', e.target.value)}
                          placeholder="e.g. 66th National School Games"
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Awards / Medals Won
                        </label>
                        <input
                          type="text"
                          value={entry.awardsOrMedals || ''}
                          onChange={(e) => updateSportsEntry(entry.id, 'awardsOrMedals', e.target.value)}
                          placeholder="e.g. Gold Medal, Silver, Quarter-Finalist"
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Year or Duration
                        </label>
                        <input
                          type="text"
                          value={entry.achievementDate || ''}
                          onChange={(e) => updateSportsEntry(entry.id, 'achievementDate', e.target.value)}
                          placeholder="e.g. 2023 - 2024"
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Represented Team / Entity
                        </label>
                        <input
                          type="text"
                          value={entry.representedEntity || ''}
                          onChange={(e) => updateSportsEntry(entry.id, 'representedEntity', e.target.value)}
                          placeholder="e.g. State Athletic Association, University Team"
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Additional Notes / Squad Role
                        </label>
                        <input
                          type="text"
                          value={entry.notes || ''}
                          onChange={(e) => updateSportsEntry(entry.id, 'notes', e.target.value)}
                          placeholder="e.g. Team Captain, Selected for national coaching camp"
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* OTHER ACHIEVEMENTS & AWARDS */}
        {/* ==================================================================== */}
        {activeTab === 'otherAchievements' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Honors, Research & Leadership
                </span>
                <h2 className="text-xl font-bold text-gray-900">Other Achievements & Awards</h2>
                <p className="text-xs text-gray-600">
                  Academic honors, olympiad distinctions, research publications, community leadership, and certifications.
                </p>
              </div>

              <button
                type="button"
                onClick={addOtherAchievementEntry}
                className="btn-brand text-white text-xs px-3.5 py-2 rounded-xl inline-flex items-center gap-1.5 font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Add Achievement</span>
              </button>
            </div>

            {(!profile.otherAchievements || profile.otherAchievements.length === 0) ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-2xl bg-gray-50/50">
                <Award className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-gray-700">No achievements recorded yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                  Add academic awards, hackathon wins, research papers, or volunteering leadership to strengthen your scholarship profile.
                </p>
                <button
                  type="button"
                  onClick={addOtherAchievementEntry}
                  className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover inline-flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Achievement</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {profile.otherAchievements.map((entry, idx) => (
                  <div
                    key={entry.id || idx}
                    className="p-5 rounded-2xl border border-border bg-white shadow-sm space-y-4 relative"
                  >
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-gray-900 text-sm">
                          {entry.title || 'Untitled Achievement'}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                          {entry.category.replace('_', ' ')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOtherAchievementEntry(entry.id)}
                        className="text-gray-400 hover:text-red-600 transition p-1"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={entry.category}
                          onChange={(e) => updateOtherAchievementEntry(entry.id, 'category', e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs bg-white focus:ring-2 focus:ring-brand"
                        >
                          <option value="ACADEMIC_AWARD">Academic Award / Rank</option>
                          <option value="OLYMPIAD_COMPETITION">Olympiad / National Competition</option>
                          <option value="RESEARCH">Research Paper / Publication</option>
                          <option value="LEADERSHIP">Leadership Role / Student Head</option>
                          <option value="VOLUNTEERING">Volunteering / Community Service</option>
                          <option value="ARTS_CULTURAL">Arts / Debate / Cultural</option>
                          <option value="PROFESSIONAL_CERTIFICATION">Professional Certification</option>
                          <option value="OTHER">Other Distinction</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Title / Honor Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={entry.title}
                          onChange={(e) => updateOtherAchievementEntry(entry.id, 'title', e.target.value)}
                          placeholder="e.g. National Cyber Olympiad Gold"
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Awarding Body / Organization
                        </label>
                        <input
                          type="text"
                          value={entry.issuerOrOrganization || ''}
                          onChange={(e) => updateOtherAchievementEntry(entry.id, 'issuerOrOrganization', e.target.value)}
                          placeholder="e.g. Science Olympiad Foundation, IEEE"
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Year or Date
                        </label>
                        <input
                          type="text"
                          value={entry.achievementDate || ''}
                          onChange={(e) => updateOtherAchievementEntry(entry.id, 'achievementDate', e.target.value)}
                          placeholder="e.g. 2024"
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Brief Description / Impact
                        </label>
                        <input
                          type="text"
                          value={entry.description || ''}
                          onChange={(e) => updateOtherAchievementEntry(entry.id, 'description', e.target.value)}
                          placeholder="e.g. Ranked 14th across 50,000 national participants"
                          className="w-full px-3 py-2 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}



        {/* ==================================================================== */}
        {/* DISABILITY & ACCESSIBILITY (VOLUNTARY) */}
        {/* ==================================================================== */}
        {activeTab === 'accessibility' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                Disability & Inclusion
              </span>
              <h2 className="text-xl font-bold text-gray-900">Disability & Accessibility Support</h2>
              <p className="text-xs text-gray-600">
                Voluntary disclosure for university accommodations (accessible dorms, extended exam time, assistive equipment) and disability grant matching.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-700" />
                <span>Strictly Voluntary & Non-Penalizing</span>
              </p>
              <p className="text-[11px] text-amber-800">
                Under the German General Equal Treatment Act (AGG) and university disability charters, disclosing a disability or chronic condition will NEVER negatively affect your admission chances or qualification percentage. It is used exclusively to facilitate university support services and evaluate eligibility for the Deutsches Studierendenwerk Disability Grant (€300 - €1,000/mo).
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-gray-50/50 space-y-4">
              <label className="flex items-center gap-3 text-sm font-bold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.accessibility?.wantsToDisclose ?? false}
                  onChange={(e) => updateAccessibility('wantsToDisclose', e.target.checked)}
                  className="rounded text-brand w-4 h-4"
                />
                <span>I would like to disclose an accessibility need or disability for accommodation & grant matching</span>
              </label>

              {profile.accessibility?.wantsToDisclose && (
                <div className="space-y-4 pt-3 border-t border-border">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                      Types of Support or Accommodations Needed
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.accessibility?.hasPhysicalDisability ?? false}
                          onChange={(e) => updateAccessibility('hasPhysicalDisability', e.target.checked)}
                          className="rounded text-brand"
                        />
                        <span>Physical / Mobility Support (e.g. barrier-free access, wheelchair accessible housing)</span>
                      </label>

                      <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.accessibility?.hasVisualImpairment ?? false}
                          onChange={(e) => updateAccessibility('hasVisualImpairment', e.target.checked)}
                          className="rounded text-brand"
                        />
                        <span>Visual Impairment (e.g. screen readers, high-contrast materials, tactile guidance)</span>
                      </label>

                      <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.accessibility?.hasHearingImpairment ?? false}
                          onChange={(e) => updateAccessibility('hasHearingImpairment', e.target.checked)}
                          className="rounded text-brand"
                        />
                        <span>Hearing Impairment (e.g. inductive hearing loops, sign language interpretation)</span>
                      </label>

                      <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.accessibility?.hasLearningOrNeurodevelopmental ?? false}
                          onChange={(e) => updateAccessibility('hasLearningOrNeurodevelopmental', e.target.checked)}
                          className="rounded text-brand"
                        />
                        <span>Neurodiversity / Learning (e.g. quiet exam rooms, extra exam time, ADHD/dyslexia support)</span>
                      </label>

                      <label className="flex items-center gap-2 text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.accessibility?.hasOtherDisability ?? false}
                          onChange={(e) => updateAccessibility('hasOtherDisability', e.target.checked)}
                          className="rounded text-brand"
                        />
                        <span>Other Chronic Illness or Medical Condition</span>
                      </label>
                    </div>
                  </div>

                  {profile.accessibility?.hasOtherDisability && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Please describe the condition
                      </label>
                      <input
                        type="text"
                        value={profile.accessibility?.otherDisabilityDescription || ''}
                        onChange={(e) => updateAccessibility('otherDisabilityDescription', e.target.value)}
                        placeholder="e.g. Chronic autoimmune condition requiring regular treatment"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Specific Accommodations Required in Germany
                    </label>
                    <textarea
                      rows={3}
                      value={profile.accessibility?.accommodationsRequired || ''}
                      onChange={(e) => updateAccessibility('accommodationsRequired', e.target.value)}
                      placeholder="e.g. Accessible ground-floor student housing; 25% extra exam duration; digital lecture transcripts."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-border flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="sens-consent-acc"
                      checked={profile.accessibility?.sensitiveDataConsent ?? false}
                      onChange={(e) => updateAccessibility('sensitiveDataConsent', e.target.checked)}
                      className="rounded text-brand mt-0.5"
                    />
                    <label htmlFor="sens-consent-acc" className="text-[11px] text-gray-700 cursor-pointer">
                      I voluntarily consent for these accessibility accommodation details to be processed to match me with German university disability services and Deutsches Studierendenwerk mobility grants.
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



        {/* ==================================================================== */}
        {/* SECTION M: ADDITIONAL INFORMATION & REVIEW */}
        {/* ==================================================================== */}
        {activeTab === 'additional' && (
          <div className="space-y-6">
            <div className="border-b border-border pb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                Section M
              </span>
              <h2 className="text-xl font-bold text-gray-900">Additional Information & Final Review</h2>
              <p className="text-xs text-gray-600">
                Any specific constraints, family accompaniment, health accommodations, or advisor notes.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Additional Preferences & Constraints
                </label>
                <textarea
                  rows={2}
                  value={profile.additional?.additionalPreferences || ''}
                  onChange={(e) => updateAdditional('additionalPreferences', e.target.value)}
                  placeholder="e.g. Looking for tech hubs with high Werkstudent opportunities; prefer public transportation accessibility."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  General Notes for Educaro Advisors
                </label>
                <textarea
                  rows={2}
                  value={profile.additional?.additionalNotes || ''}
                  onChange={(e) => updateAdditional('additionalNotes', e.target.value)}
                  placeholder="Questions or guidance requests for your consultation session..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            {/* Profile Summary Card */}
            <div className="p-5 rounded-2xl bg-gray-50 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Profile Snapshot Review
                </h4>
                <span className="text-xs font-bold text-brand">
                  {progressPct}% Completed
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">Applicant</span>
                  <p className="font-bold text-gray-900">{profile.personal?.fullName || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">Pathway</span>
                  <p className="font-bold text-gray-900">{profile.goals?.primaryPathway || 'Study'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">German Grade</span>
                  <p className="font-bold text-emerald-700">{liveGermanGrade || 'Pending'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">German Level</span>
                  <p className="font-bold text-gray-900">{profile.languages?.germanLevel || 'NONE'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="btn-secondary text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-2 font-semibold disabled:opacity-40"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Section</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="btn-secondary text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 font-semibold"
            >
              <Save className="w-3.5 h-3.5 text-gray-600" />
              <span>Save Draft</span>
            </button>

            {currentStepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isSaving}
                className="btn-brand text-white text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-2 font-semibold shadow-xs"
              >
                <span>Save & Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSaving}
                className="btn-brand text-white text-xs px-6 py-2.5 rounded-xl inline-flex items-center gap-2 font-semibold shadow-md"
              >
                <span>Continue to Documents</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
