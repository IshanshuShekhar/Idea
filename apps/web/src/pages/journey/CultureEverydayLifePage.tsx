import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { StepHeader } from '../../components/StepHeader';
import { AgentTracePanel } from '../../components/AgentTracePanel';
import {
  Compass,
  Clock,
  MessageSquare,
  Users,
  GraduationCap,
  Briefcase,
  HeartHandshake,
  Recycle,
  Volume2,
  VolumeX,
  ShoppingBag,
  Train,
  Home,
  Utensils,
  Landmark,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  ExternalLink,
  ArrowRight,
  BookOpen,
  Info,
  ShieldAlert,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CultureComparison {
  id: string;
  topic: string;
  icon: React.ElementType;
  indiaContext: string;
  germanyContext: string;
  practicalExample: string;
  helpfulTip: string;
}

interface EverydayLifeGuide {
  id: string;
  title: string;
  germanTerm: string;
  icon: React.ElementType;
  category: 'DAILY' | 'HOUSING' | 'LEGAL' | 'COMMUNITY';
  summary: string;
  keyPoints: string[];
  proTip: string;
}

interface ScenarioOption {
  text: string;
  isRecommended: boolean;
  explanation: string;
}

interface ScenarioItem {
  id: string;
  title: string;
  situation: string;
  options: ScenarioOption[];
}

interface GermanPhrase {
  id: string;
  german: string;
  english: string;
  pronunciation: string;
  category: 'GREETINGS' | 'SHOPPING' | 'TRANSIT' | 'UNIVERSITY' | 'HOUSING' | 'APPOINTMENTS' | 'HELP';
}

export const CultureEverydayLifePage: React.FC = () => {
  const navigate = useNavigate();
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  // Scenario quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedScenarios, setSubmittedScenarios] = useState<Record<string, boolean>>({});

  // Phrase search and category filter state
  const [phraseSearch, setPhraseSearch] = useState('');
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState<string>('ALL');

  // Expanded everyday life cards
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpandCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Section A Data: Cultural Comparisons
  const culturalComparisons: CultureComparison[] = [
    {
      id: 'punctuality',
      topic: 'Punctuality & Time Management (Pünktlichkeit)',
      icon: Clock,
      indiaContext:
        'In informal settings, social arrival times often carry a flexible buffer (15–30 minutes) to accommodate traffic conditions and dynamic schedules.',
      germanyContext:
        'Exact timing is considered fundamental respect for others. Arriving 5 minutes early for classes, appointments (Termine), and meetings is standard courtesy.',
      practicalExample:
        'If a lecture begins at 10:15 (c.t. - cum tempore), you are expected to be seated by 10:14. If delayed on public transit, sending a message with your ETA 10 minutes prior is standard practice.',
      helpfulTip:
        'Always plan an extra 10–15 minute buffer for transit. If an unforeseen delay occurs, notify the other person immediately with your expected arrival time rather than apologizing after arriving.',
    },
    {
      id: 'communication',
      topic: 'Communication & Personal Space (Direktheit & Privatsphäre)',
      icon: MessageSquare,
      indiaContext:
        'High-context, relational communication. Polite indirectness is frequently used to preserve harmony and prevent embarrassment or discomfort.',
      germanyContext:
        'Low-context, straightforward communication (Direktheit). Direct feedback is intended to be task-oriented, objective, and efficient, not a personal critique or sign of anger.',
      practicalExample:
        'A project partner might say: "This calculation has an error; please redo it." They are focusing entirely on the technical quality of the work, not expressing personal disapproval.',
      helpfulTip:
        'Never interpret directness as hostility. Feel comfortable stating your thoughts, boundaries, or questions clearly and concisely without long apologies.',
    },
    {
      id: 'greetings',
      topic: 'Greetings & Formalities (Sie vs. Du & Begrüßung)',
      icon: HeartHandshake,
      indiaContext:
        'Warm verbal greetings, folded hands (Namaste), and addressing seniors or university professors as "Sir" or "Ma\'am".',
      germanyContext:
        'Firm handshake with eye contact in formal settings. Strict distinction between formal "Sie" (professors, officials, strangers) and informal "du" (peers, flatmates, friends).',
      practicalExample:
        'In student dorms or sports clubs, "du" and first names are the universal norm: "Hallo, ich bin Rahul." When emailing an academic supervisor: "Sehr geehrte Frau Prof. Dr. Becker".',
      helpfulTip:
        'Follow the rule of thumb: use "Sie" in official, administrative, and academic settings until the other person explicitly offers "du" (das Du anbieten). Among fellow students, "du" is default.',
    },
    {
      id: 'university',
      topic: 'University & Classroom Culture (Eigenverantwortung)',
      icon: GraduationCap,
      indiaContext:
        'Guided classroom attendance, frequent professor check-ins, structured question banks, and guided preparation milestones for semester tests.',
      germanyContext:
        'Extreme self-reliance (Eigenverantwortung). Professors treat students as independent researchers who manage their own reading, exam registrations, and deadlines.',
      practicalExample:
        'Lecture attendance is often voluntary, but missing the strict online exam registration window (Prüfungsanmeldung) means you cannot sit for the exam that semester.',
      helpfulTip:
        'Mark all portal deadlines on your calendar during the first week of lectures. Visit professors during their designated office hours (Sprechstunde) with specific, prepared questions.',
    },
    {
      id: 'workplace',
      topic: 'Workplace & Professional Boundaries (Feierabend & Struktur)',
      icon: Briefcase,
      indiaContext:
        'Fluid boundaries between work and personal life, flexible schedules, spontaneous brainstorming, and socializing extensively with colleagues after hours.',
      germanyContext:
        'Clear separation between work and personal life (Feierabend). Structured agendas sent ahead of meetings, concise emails, and strong respect for off-hours and weekends.',
      practicalExample:
        'German colleagues typically log off on time and rarely check work email or Slack over the weekend. Professional emails highlight key action items in bullet points.',
      helpfulTip:
        'Keep workplace communication structured and concise. Avoid calling colleagues outside agreed working hours unless there is an urgent, pre-arranged emergency.',
    },
    {
      id: 'friendships',
      topic: 'Friendships & Social Life (Freundschaften & Vereine)',
      icon: Users,
      indiaContext:
        'Spontaneous drop-in visits, large open social circles, fast conversational warmth, and frequent informal group outings.',
      germanyContext:
        'Friendships form more slowly but are deeply reliable. Spontaneous visits at home are rare; social gatherings are scheduled days in advance. Clubs (Vereine) are central to community life.',
      practicalExample:
        'Coffee or dinner plans with German peers are usually arranged for a specific day next week rather than a last-minute same-day invitation.',
      helpfulTip:
        'Join university student initiatives (Fachschaft), university sports (Hochschulsport), language tandems, or volunteer groups (Vereine). If you RSVP to an event, make sure to attend reliably.',
    },
  ];

  // Section B Data: Everyday Life Guide Cards
  const everydayLifeGuides: EverydayLifeGuide[] = [
    {
      id: 'recycling',
      title: 'Waste Separation & Bottle Deposit',
      germanTerm: 'Mülltrennung & Pfandsystem',
      icon: Recycle,
      category: 'DAILY',
      summary:
        'Germany operates one of the world\'s most structured recycling systems. Proper waste sorting is a legal civic duty and social expectation.',
      keyPoints: [
        'Gelber Sack / Wertstofftonne (Yellow): Plastic packaging, cartons, aluminium, and composite materials carrying the Grüner Punkt.',
        'Papiertonne (Blue): Clean paper, cardboard, and newspapers (do not dispose dirty pizza boxes here).',
        'Biomüll (Brown/Green): Fruit peels, vegetable scraps, tea bags, and organic food waste.',
        'Restmüll (Black/Grey): Non-recyclable household waste (tissues, porcelain, vacuum dust, pens).',
        'Glascontainer: Deposit non-returnable bottles by colour (white, green, brown) only between 7:00 AM – 8:00 PM on weekdays.',
        'Pfand system: Return plastic bottles (Einwegpfand €0.25) and beer/glass bottles (Mehrwegpfand €0.08–€0.15) at supermarket reverse vending machines for cash receipts.',
      ],
      proTip:
        'Always look for the Pfand symbol on beverage bottles before throwing them away. Returning them during your regular supermarket trips easily saves €10–€20 a month!',
    },
    {
      id: 'quiet_hours',
      title: 'Quiet Hours & Consideration for Neighbours',
      germanTerm: 'Ruhezeit & Rücksichtnahme',
      icon: VolumeX,
      category: 'COMMUNITY',
      summary:
        'German apartment buildings enforce statutory quiet hours (Ruhezeit) to ensure residents can sleep and relax peacefully.',
      keyPoints: [
        'Night Quiet Hours: 10:00 PM to 6:00 AM or 7:00 AM every night.',
        'All-Day Sunday Quiet Hours (Sonntagsruhe): The entire day on Sundays and official public holidays.',
        'During Ruhezeiten, avoid loud music, vacuuming, laundry washing, DIY drilling, or slamming hallway doors.',
        'If you plan to host a birthday party or gathering, inform your building neighbours a few days in advance by posting a polite notice in the hallway.',
      ],
      proTip:
        'Sunday is dedicated to rest. Enjoy parks, walking, museums, or quiet studying at home, and save noisy chores for Saturday.',
    },
    {
      id: 'shopping_hours',
      title: 'Shopping Hours & Closed Sundays',
      germanTerm: 'Ladenschlussgesetz & Sonntagsruhe',
      icon: ShoppingBag,
      category: 'DAILY',
      summary:
        'By federal and state law (Ladenschlussgesetz), retail stores and supermarkets are closed on Sundays and public holidays.',
      keyPoints: [
        'Supermarkets are typically open Monday through Saturday from 7:00/8:00 AM until 8:00 PM or 10:00 PM (depending on the federal state).',
        'On Sundays, supermarkets, retail stores, clothing shops, and pharmacies are closed.',
        'Emergency exceptions: Supermarkets located inside major railway stations (Hauptbahnhof) and airports remain open on Sundays.',
        'Emergency pharmacies (Notdienstapotheke) operate on rotation for urgent medical supplies 24/7.',
      ],
      proTip:
        'Always plan your weekly groceries on Friday or Saturday. Keep non-perishable pantry staples (lentils, rice, pasta) stocked at home.',
    },
    {
      id: 'public_transport',
      title: 'Public Transport & Transit Etiquette',
      germanTerm: 'Öffentlicher Personennahverkehr (ÖPNV)',
      icon: Train,
      category: 'DAILY',
      summary:
        'Public transport operates on an honour system with spot-check inspections. Trains and buses run strictly on scheduled timetables.',
      keyPoints: [
        'There are no turnstiles at German train or subway stations. You must hold a valid, validated ticket before boarding.',
        'Spot-check ticket inspectors (Fahrkartenkontrolleure) in plain clothes check tickets frequently. Riding without a valid ticket (Schwarzfahren) incurs an immediate €60 fine.',
        'Escalator etiquette: "Rechts stehen, links gehen" (Stand on the right, walk on the left).',
        'Always let exiting passengers leave the bus or train completely before stepping in.',
        'Keep phone conversations quiet and use headphones at all times in transit.',
      ],
      proTip:
        'Your university semester ticket (Semesterticket) or Deutschlandticket covers extensive regional transit. Keep your student ID and a photo ID on your phone or wallet.',
    },
    {
      id: 'wg_living',
      title: 'Shared Living & Ventilation Routine',
      germanTerm: 'Wohngemeinschaft (WG) & Stoßlüften',
      icon: Home,
      category: 'HOUSING',
      summary:
        'Most students in Germany live in flatshares (WGs) where flatmates share responsibilities, kitchen upkeep, and seasonal ventilation.',
      keyPoints: [
        'Cleaning Schedule (Putzplan): Flatmates rotate weekly duties for vacuuming hallways, cleaning shared bathrooms, and taking out bins.',
        'Stoßlüften (Shock Ventilation): Open all windows wide for 5–10 minutes 2–3 times a day in winter to replace humid air and prevent wall mould.',
        'Heating management: Adjust thermostatic radiator valves (1–5 scale). Avoid leaving windows tilted open while heaters are turned on.',
        'Respect common food boundaries: Label your shelf in the fridge and ask before using shared seasonings.',
      ],
      proTip:
        'Stoßlüften is a genuine necessity in insulated German buildings during winter. 5 minutes of wide-open windows prevents dampness and mould without cooling the walls.',
    },
    {
      id: 'food_mensa',
      title: 'Groceries, Cooking & University Cafeteria',
      germanTerm: 'Einkaufen & Mensa',
      icon: Utensils,
      category: 'DAILY',
      summary:
        'Eating well in Germany is affordable if you balance cooking at home with subsidized student cafeterias (Mensen).',
      keyPoints: [
        'Discount supermarkets (Aldi, Lidl, Netto, Penny) offer high-quality produce and groceries at student-friendly prices.',
        'Indian & Asian grocery stores (Asialäden) exist in nearly all university towns, stocking daal, basmati rice, spices, paneer, and atta.',
        'University cafeterias (Mensa) provide nutritious, hot meals for €2.50 to €5.00 with vegan, vegetarian, halal, and pork-free choices clearly marked.',
        'Bring your own reusable cloth bag (Stoffbeutel) to grocery stores. Supermarkets charge for shopping bags, and cashiers scan items quickly.',
      ],
      proTip:
        'Pack your groceries directly into your shopping cart at the checkout, then move to the packing counter to bag them at your own pace.',
    },
    {
      id: 'official_admin',
      title: 'Official Bureaucracy & Mailbox Checking',
      germanTerm: 'Bürgeramt, Anmeldung & Briefkasten',
      icon: Landmark,
      category: 'LEGAL',
      summary:
        'German administration is process-driven and highly reliant on physical postal mail. Managing your documents methodically is essential.',
      keyPoints: [
        'City Registration (Anmeldung): You must register your residence at the local Bürgeramt within 14 days of moving in (requires a landlord certificate: Wohnungsgeberbestätigung).',
        'Physical Mailbox (Briefkasten): Ensure your surname is clearly labelled on your apartment and building mailbox. German post does not deliver mail if the surname is missing.',
        'Official letters: Tax ID (Steuer-ID), bank cards, social security cards, and health insurance notices arrive strictly via Deutsche Post.',
        'Broadcasting Fee (Rundfunkbeitrag / GEZ): Statutory fee of €18.36/month per apartment (split among all flatmates in a WG).',
      ],
      proTip:
        'Check your physical mailbox every day. German administrative letters contain official deadlines (Fristen) that begin counting from the date of post delivery.',
    },
    {
      id: 'community_clubs',
      title: 'Student Clubs & International Support',
      germanTerm: 'Fachschaft, Hochschulsport & International Office',
      icon: Sparkles,
      category: 'COMMUNITY',
      summary:
        'Universities have dedicated infrastructure to help international students connect, make friends, and integrate smoothly.',
      keyPoints: [
        'International Office (Akademisches Auslandsamt): First point of contact for visa extensions, welcome weeks, and orientation.',
        'Student Faculty Council (Fachschaft): Senior student representatives who host orientation events (Erstsemester-Woche), publish exam archives, and organize social parties.',
        'Hochschulsport: Subsidized fitness courses, team sports (cricket, badminton, football, yoga), and outdoor excursions starting as low as €15/semester.',
        'Language Tandem: Pair up with a German student who wants to learn Hindi/English while helping you practice conversational German over coffee.',
      ],
      proTip:
        'Attend every single event during Orientation Week (O-Woche). It is the easiest, most relaxed time to meet fellow newcomers and form study groups.',
    },
  ];

  // Section C Data: Do's and Don'ts
  const dosList = [
    'Do arrive 5 minutes early for classes, interviews, doctor appointments, and train departures.',
    'Do separate household waste into the designated bins (Yellow, Paper, Organic, Residual) and return Pfand bottles.',
    'Do respect quiet hours (Ruhezeit) from 10:00 PM to 6:00/7:00 AM on weekdays and all day Sunday.',
    'Do address university professors, doctors, and municipal officials with formal "Sie" and their academic title.',
    'Do open your room windows wide for 5–10 minutes twice daily (Stoßlüften) in winter to prevent mould.',
    'Do check your physical building mailbox (Briefkasten) daily for official administrative mail.',
    'Do ask questions politely whenever you are unsure about an administrative process or local custom.',
    'Do register your apartment address at the local Bürgeramt (Anmeldung) within 14 days of moving in.',
  ];

  const dontsList = [
    'Don\'t assume direct feedback or constructive criticism means someone is angry with or dislikes you.',
    'Don\'t visit friends or acquaintances at home without asking and arranging beforehand.',
    'Don\'t cross empty pedestrian crossings on a red light (Ampel), especially in front of young children.',
    'Don\'t vacuum, drill, or play loud musical instruments on Sundays or official public holidays.',
    'Don\'t board a tram, bus, or train without validating or holding a valid ticket (Schwarzfahren).',
    'Don\'t address officials, elders, or strangers with informal "du" unless they offer it to you.',
    'Don\'t assume that every person, university, or region in Germany follows identical customs.',
    'Don\'t leave windows tilted open for hours while room radiators are running on full power.',
  ];

  // Section D Data: Interactive Scenarios
  const scenarios: ScenarioItem[] = [
    {
      id: 'scen-1',
      title: 'Running Late for a University Appointment',
      situation:
        'Your regional train is delayed by signal maintenance, and you will arrive 15 minutes late for your 11:00 AM one-on-one thesis meeting with your professor.',
      options: [
        {
          text: 'Run as fast as you can from the train station and apologize profusely when you finally enter their office.',
          isRecommended: false,
          explanation:
            'While apologizing is polite, the professor has blocked a specific time slot and may assume you simply forgot or failed to plan properly.',
        },
        {
          text: 'Send a concise, polite email from the train right now, stating your train delay, apologizing for the inconvenience, and giving an exact estimated arrival time (11:15 AM).',
          isRecommended: true,
          explanation:
            'Recommended! Informing the professor in advance shows high respect for their schedule. They can use the 15 minutes productively and will appreciate your prompt communication.',
        },
        {
          text: 'Skip the appointment entirely without writing, and request a new appointment next week.',
          isRecommended: false,
          explanation:
            'A no-show without notification creates a very negative impression in academic settings and wastes faculty office hours.',
        },
      ],
    },
    {
      id: 'scen-2',
      title: 'Flatmate Points Out Incorrect Waste Separation',
      situation:
        'Your German WG flatmate notices a plastic packaging wrapper in the brown organic waste bin and points it out to you in the kitchen.',
      options: [
        {
          text: 'Thank them, move the wrapper to the yellow bin, and politely ask them to show you which items belong where so you get it right next time.',
          isRecommended: true,
          explanation:
            'Recommended! Asking for practical clarification shows openness and maturity. Waste separation is a communal norm, and flatmates appreciate straightforward cooperation.',
        },
        {
          text: 'Assume they are angry at you personally and avoid speaking to them in the kitchen for the rest of the week.',
          isRecommended: false,
          explanation:
            'In Germany, pointing out an objective mistake is task-focused feedback, not personal dislike. Avoiding them creates unnecessary tension over a minor daily chore.',
        },
        {
          text: 'Tell them it doesn\'t matter because it all ends up in the same place anyway.',
          isRecommended: false,
          explanation:
            'Municipalities in Germany levy hefty penalties on building landlords if organic waste is contaminated with plastics, which can increase shared utility costs for the whole flat.',
        },
      ],
    },
    {
      id: 'scen-3',
      title: 'Emailing a Professor with a Question',
      situation:
        'You have a question regarding the literature reading list for next week\'s seminar, and you need to contact Professor Becker.',
      options: [
        {
          text: '"Hey Prof, what papers should I read for next week? Thanks, Rahul"',
          isRecommended: false,
          explanation:
            'Too informal. University professors in Germany expect formal salutations and clear context regarding the specific lecture course.',
        },
        {
          text: '"Sehr geehrte Frau Prof. Dr. Becker, I am enrolled in your seminar [Course Title, Matrikelnummer]. Regarding the reading list for topic X, could you please clarify..."',
          isRecommended: true,
          explanation:
            'Recommended! It uses the correct academic title, formal greeting ("Sehr geehrte..."), identifies the course and student ID, and states the question concisely.',
        },
        {
          text: 'Send a direct message to their personal Instagram or LinkedIn account.',
          isRecommended: false,
          explanation:
            'Personal social media accounts are strictly private in Germany. Always communicate through official university email addresses.',
        },
      ],
    },
    {
      id: 'scen-4',
      title: 'Neighbour Knocks About Noise on Sunday Afternoon',
      situation:
        'You are listening to music on Sunday at 3:00 PM with the balcony door slightly ajar. An elderly neighbour knocks on your apartment door.',
      options: [
        {
          text: 'Apologize politely, turn down the volume immediately, and acknowledge Sunday quiet hours (Sonntagsruhe).',
          isRecommended: true,
          explanation:
            'Recommended! Sunday is protected by law as a day of quiet rest. Responding with calm courtesy de-escalates the situation immediately.',
        },
        {
          text: 'Argue that it is afternoon, not nighttime, and you have the right to play music.',
          isRecommended: false,
          explanation:
            'Sunday quiet hours (Sonntagsruhe) apply the entire day, not just at night. Arguing will likely result in a complaint to the building management (Hausverwaltung).',
        },
        {
          text: 'Pretend you are not at home and keep the music playing.',
          isRecommended: false,
          explanation:
            'Ignoring the neighbour worsens neighbourly relations and may lead to a formal warning letter from the landlord.',
        },
      ],
    },
    {
      id: 'scen-5',
      title: 'Invited to a Student Flat Gathering',
      situation:
        'A classmate invites you to a casual social gathering at their shared flat on Friday at 8:00 PM.',
      options: [
        {
          text: 'Arrive at 8:00–8:15 PM, ask the host "Can I bring anything along?" (Mitbringsel), and take off your shoes if the host does.',
          isRecommended: true,
          explanation:
            'Recommended! Bringing a small beverage or snack to a flat gathering is standard courtesy. Arriving within 15 minutes of the agreed time is appreciated.',
        },
        {
          text: 'Bring four of your friends along at 10:30 PM without asking or informing the host.',
          isRecommended: false,
          explanation:
            'Bringing unannounced guests to a private apartment without asking beforehand can make the host uncomfortable due to limited space and refreshments.',
        },
        {
          text: 'Say yes enthusiastically, but don\'t show up or send a message.',
          isRecommended: false,
          explanation:
            'Germans value reliability (Zuverlässigkeit). If you confirm attendance, the host plans snacks and seating for you. If plans change, cancel early.',
        },
      ],
    },
    {
      id: 'scen-6',
      title: 'Official Letter Arrives in the Mailbox',
      situation:
        'A letter in formal German arrives from the city finance office (Finanzamt) or health insurance company, and you cannot decipher the dense legal phrasing.',
      options: [
        {
          text: 'Put it in a drawer and wait until you speak better German next year.',
          isRecommended: false,
          explanation:
            'Official letters in Germany almost always contain strict response deadlines (Fristen). Ignoring them can lead to administrative penalty fees.',
        },
        {
          text: 'Scan the letter using a translation app (DeepL / Google Translate), note any deadline or reference number (Aktenzeichen), and consult the university International Office or a trusted mentor if unclear.',
          isRecommended: true,
          explanation:
            'Recommended! DeepL provides accurate German translations. Identifying deadlines and reference numbers allows student advisors to assist you immediately.',
        },
        {
          text: 'Post a full photo of the letter including your tax ID and address onto an open public Facebook group asking for help.',
          isRecommended: false,
          explanation:
            'Risk of identity theft and data exposure. Never share private tax numbers (Steuer-ID), social security numbers, or full addresses publicly online.',
        },
      ],
    },
    {
      id: 'scen-7',
      title: 'Ordering at a Local Bakery with Limited German',
      situation:
        'You walk into a local bakery to buy bread rolls. The shop assistant is elderly and does not speak English.',
      options: [
        {
          text: 'Greet them with a friendly "Guten Tag!", make an attempt in simple German: "Ein Brötchen bitte. Ich lerne noch Deutsch!", and point politely.',
          isRecommended: true,
          explanation:
            'Recommended! Making an honest effort in basic German is warmly received. Locals will speak more slowly, smile, and help you through the transaction.',
        },
        {
          text: 'Speak English much louder and repeatedly until they understand.',
          isRecommended: false,
          explanation:
            'Speaking louder in English does not help comprehension and can feel intimidating. A polite attempt in German or simple gestures works far better.',
        },
        {
          text: 'Walk out without ordering anything.',
          isRecommended: false,
          explanation:
            'Everyday transactions like buying bread or coffee are the best, low-stakes opportunities to practice conversational German in real life!',
        },
      ],
    },
  ];

  const handleSelectOption = (scenarioId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [scenarioId]: optionIndex }));
    setSubmittedScenarios((prev) => ({ ...prev, [scenarioId]: true }));
  };

  const handleRetryScenario = (scenarioId: string) => {
    setSelectedAnswers((prev) => {
      const copy = { ...prev };
      delete copy[scenarioId];
      return copy;
    });
    setSubmittedScenarios((prev) => {
      const copy = { ...prev };
      delete copy[scenarioId];
      return copy;
    });
  };

  const completedScenariosCount = useMemo(() => {
    return Object.keys(submittedScenarios).length;
  }, [submittedScenarios]);

  // Section E Data: Useful German Phrases Library
  const phrasesList: GermanPhrase[] = [
    // Greetings & Courtesy
    {
      id: 'p-1',
      german: 'Guten Tag!',
      english: 'Good day! / Hello! (Formal/Standard)',
      pronunciation: 'Goo-ten Tahg',
      category: 'GREETINGS',
    },
    {
      id: 'p-2',
      german: 'Guten Morgen! / Guten Abend!',
      english: 'Good morning! / Good evening!',
      pronunciation: 'Goo-ten Mor-gen / Goo-ten Ah-bend',
      category: 'GREETINGS',
    },
    {
      id: 'p-3',
      german: 'Hallo! / Tschüss!',
      english: 'Hello! / Bye! (Informal)',
      pronunciation: 'Hah-lo / Tshoos',
      category: 'GREETINGS',
    },
    {
      id: 'p-4',
      german: 'Auf Wiedersehen!',
      english: 'Goodbye! (Formal)',
      pronunciation: 'Owf Vee-der-zay-en',
      category: 'GREETINGS',
    },
    {
      id: 'p-5',
      german: 'Vielen Dank! / Bitte schön!',
      english: 'Thank you very much! / You are welcome!',
      pronunciation: 'Fee-len Dank / Bit-te shern',
      category: 'GREETINGS',
    },
    {
      id: 'p-6',
      german: 'Entschuldigung!',
      english: 'Excuse me! / Sorry!',
      pronunciation: 'Ent-shool-dee-goong',
      category: 'GREETINGS',
    },

    // Shopping
    {
      id: 'p-7',
      german: 'Ich hätte gerne ein Brötchen, bitte.',
      english: 'I would like a bread roll, please.',
      pronunciation: 'Ikh het-te gair-ne eye-n Brert-khen, bit-te',
      category: 'SHOPPING',
    },
    {
      id: 'p-8',
      german: 'Wie viel kostet das?',
      english: 'How much does that cost?',
      pronunciation: 'Vee feel kos-tet dahs?',
      category: 'SHOPPING',
    },
    {
      id: 'p-9',
      german: 'Kann ich mit Karte zahlen?',
      english: 'Can I pay by card?',
      pronunciation: 'Kahn ikh mit Kar-te tsah-len?',
      category: 'SHOPPING',
    },
    {
      id: 'p-10',
      german: 'Ich brauche keine Tüte, danke.',
      english: 'I do not need a shopping bag, thank you.',
      pronunciation: 'Ikh brow-khe kye-ne Too-te, dahn-ke',
      category: 'SHOPPING',
    },
    {
      id: 'p-11',
      german: 'Haben Sie vegetarische / halal Optionen?',
      english: 'Do you have vegetarian / halal options?',
      pronunciation: 'Hah-ben Zee ve-ge-tah-ree-she op-tsee-oh-nen?',
      category: 'SHOPPING',
    },

    // Public Transport
    {
      id: 'p-12',
      german: 'Fährt dieser Zug nach Frankfurt?',
      english: 'Does this train go to Frankfurt?',
      pronunciation: 'Fairt dee-zer Tsoog nahkh Frahnk-foort?',
      category: 'TRANSIT',
    },
    {
      id: 'p-13',
      german: 'Wo ist Gleis 4?',
      english: 'Where is platform 4?',
      pronunciation: 'Voh ist Glyce feer?',
      category: 'TRANSIT',
    },
    {
      id: 'p-14',
      german: 'Ein Ticket nach Berlin bitte.',
      english: 'One ticket to Berlin, please.',
      pronunciation: 'Eye-n Tik-ket nahkh Bair-leen bit-te',
      category: 'TRANSIT',
    },
    {
      id: 'p-15',
      german: 'Muss ich umsteigen?',
      english: 'Do I have to change trains?',
      pronunciation: 'Moos ikh oom-shty-gen?',
      category: 'TRANSIT',
    },

    // University
    {
      id: 'p-16',
      german: 'Wo ist der Hörsaal A?',
      english: 'Where is lecture hall A?',
      pronunciation: 'Voh ist dair Hur-sahl Ah?',
      category: 'UNIVERSITY',
    },
    {
      id: 'p-17',
      german: 'Wann beginnt die Vorlesung?',
      english: 'When does the lecture begin?',
      pronunciation: 'Vahn be-gint dee For-lay-zoong?',
      category: 'UNIVERSITY',
    },
    {
      id: 'p-18',
      german: 'Haben Sie Sprechstunde heute?',
      english: 'Do you have office hours today?',
      pronunciation: 'Hah-ben Zee Shprekh-shtoon-de hoy-te?',
      category: 'UNIVERSITY',
    },
    {
      id: 'p-19',
      german: 'Ich möchte mich für die Prüfung anmelden.',
      english: 'I would like to register for the exam.',
      pronunciation: 'Ikh merkh-te mikh foor dee Proo-foong ahn-mel-den',
      category: 'UNIVERSITY',
    },
    {
      id: 'p-20',
      german: 'Wo ist die Mensa?',
      english: 'Where is the student cafeteria?',
      pronunciation: 'Voh ist dee Men-zah?',
      category: 'UNIVERSITY',
    },

    // Housing & Living
    {
      id: 'p-21',
      german: 'Wer ist diese Woche mit dem Putzplan dran?',
      english: 'Who is on cleaning duty this week?',
      pronunciation: 'Vair ist dee-ze Vokh-e mit daim Poots-plahn drahn?',
      category: 'HOUSING',
    },
    {
      id: 'p-22',
      german: 'Können wir bitte kurz lüften?',
      english: 'Can we please air out the room briefly?',
      pronunciation: 'Kern-en veer bit-te koorts loof-ten?',
      category: 'HOUSING',
    },
    {
      id: 'p-23',
      german: 'Die Heizung funktioniert leider nicht.',
      english: 'Unfortunately, the heater is not working.',
      pronunciation: 'Dee Hy-tsoong foonk-tsee-oh-neert ly-der nikht',
      category: 'HOUSING',
    },

    // Appointments & Formalities
    {
      id: 'p-24',
      german: 'Ich habe einen Termin um 10 Uhr.',
      english: 'I have an appointment at 10:00 AM.',
      pronunciation: 'Ikh hah-be eye-nen Tair-meen oom tsain Oor',
      category: 'APPOINTMENTS',
    },
    {
      id: 'p-25',
      german: 'Ich möchte mich für die Anmeldung anmelden.',
      english: 'I would like to register my city residence address.',
      pronunciation: 'Ikh merkh-te mikh foor dee Ahn-mel-doong ahn-mel-den',
      category: 'APPOINTMENTS',
    },
    {
      id: 'p-26',
      german: 'Welche Unterlagen benötigen Sie?',
      english: 'Which documents do you require?',
      pronunciation: 'Vel-khe Oon-ter-lah-gen be-nur-tee-gen Zee?',
      category: 'APPOINTMENTS',
    },

    // Emergencies & Asking for Help
    {
      id: 'p-27',
      german: 'Können Sie mir bitte helfen?',
      english: 'Could you please help me? (Formal)',
      pronunciation: 'Kern-en Zee meer bit-te hel-fen?',
      category: 'HELP',
    },
    {
      id: 'p-28',
      german: 'Ich verstehe das leider nicht.',
      english: 'I unfortunately don\'t understand that.',
      pronunciation: 'Ikh fair-shtay-e dahs ly-der nikht',
      category: 'HELP',
    },
    {
      id: 'p-29',
      german: 'Sprechen Sie Englisch?',
      english: 'Do you speak English?',
      pronunciation: 'Shprekh-en Zee Eng-leesh?',
      category: 'HELP',
    },
    {
      id: 'p-30',
      german: 'Könnten Sie bitte etwas langsamer sprechen?',
      english: 'Could you please speak a little slower?',
      pronunciation: 'Kern-ten Zee bit-te et-vahs lahng-zah-mer shprekh-en?',
      category: 'HELP',
    },
    {
      id: 'p-31',
      german: 'Wo ist die Notaufnahme / das Krankenhaus?',
      english: 'Where is the emergency room / hospital?',
      pronunciation: 'Voh ist dee Not-owf-nah-me / dahs Krahn-ken-hows?',
      category: 'HELP',
    },
  ];

  // Filtered phrases calculation
  const filteredPhrases = useMemo(() => {
    return phrasesList.filter((item) => {
      const matchesCategory =
        selectedPhraseCategory === 'ALL' || item.category === selectedPhraseCategory;
      const matchesSearch =
        item.german.toLowerCase().includes(phraseSearch.toLowerCase()) ||
        item.english.toLowerCase().includes(phraseSearch.toLowerCase()) ||
        item.pronunciation.toLowerCase().includes(phraseSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [phraseSearch, selectedPhraseCategory]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans pb-16">
      <Navbar onToggleTracePanel={() => setIsTraceOpen(!isTraceOpen)} isTraceOpen={isTraceOpen} />

      <StepHeader
        currentStepIndex={10}
        totalSteps={10}
        stepTitle="Culture & Everyday Life"
        stepSubtitle="Practical guide to everyday German habits, etiquette, manners, useful phrases, and cultural nuances."
        backRoute="/journey/exam-prep"
        nextRoute="/journey/roadmap"
        continueLabel="Return to My Journey"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* HERO SECTION */}
        <section className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-300 text-xs font-semibold mb-4 border border-white/10">
              <Compass className="w-3.5 h-3.5" />
              <span>Cultural Orientation & Settlement Guide</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              German Culture & Everyday Life
            </h1>
            <p className="mt-3 text-sm sm:text-base text-gray-300 leading-relaxed font-light">
              Moving to Germany is about more than applications and documents. Learn the everyday customs, social expectations, and practical habits that can help you feel more confident when you arrive.
            </p>

            <div className="mt-5 p-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-teal-200/90 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>A respectful note on cultural diversity:</strong> Customs and communication styles vary across different federal states, generations, universities, and individual workplaces in Germany—just as they do across India. The guidance here offers practical benchmarks to help you navigate everyday situations comfortably.
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION A: CULTURAL DIFFERENCES — INDIA AND GERMANY */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                A
              </span>
              <h2 className="text-xl font-bold text-gray-900">Cultural Differences — India & Germany</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Explore key interpersonal differences in punctuality, directness, university autonomy, and friendships.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {culturalComparisons.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-200 p-5 bg-white shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shrink-0">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <h3 className="font-extrabold text-sm sm:text-base text-gray-900">{item.topic}</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/70 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
                          What you might be used to in India
                        </span>
                        <p className="text-xs text-gray-700 leading-relaxed">{item.indiaContext}</p>
                      </div>

                      <div className="bg-teal-50/60 p-3.5 rounded-xl border border-teal-200/70 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider block">
                          What you may encounter in Germany
                        </span>
                        <p className="text-xs text-gray-700 leading-relaxed">{item.germanyContext}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs space-y-1">
                      <strong className="text-gray-900 font-bold block text-[11px]">Real-Life Example:</strong>
                      <p className="text-gray-600 leading-relaxed">{item.practicalExample}</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                      <strong>Helpful Tip:</strong> {item.helpfulTip}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION B: EVERYDAY LIFE IN GERMANY */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                  B
                </span>
                <h2 className="text-xl font-bold text-gray-900">Everyday Life in Germany — Practical Guide</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Practical routines for first-time arrivals: recycling, quiet hours, supermarkets, WG living, and transit.
              </p>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-xl border border-gray-200">
              8 Essential Topics
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {everydayLifeGuides.map((guide) => {
              const IconComponent = guide.icon;
              const isExpanded = Boolean(expandedCards[guide.id]);

              return (
                <div
                  key={guide.id}
                  className="rounded-2xl border border-gray-200 p-5 bg-white shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded uppercase">
                        {guide.germanTerm}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900">{guide.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{guide.summary}</p>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-gray-100 space-y-2 animate-in fade-in duration-200">
                        <span className="text-[10px] uppercase font-bold text-gray-500 block">Key Standards:</span>
                        <ul className="space-y-1.5 text-[11px] text-gray-600">
                          {guide.keyPoints.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-teal-600 font-bold">•</span>
                              <span className="leading-snug">{pt}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-xl text-[11px] text-teal-900 font-medium mt-2">
                          <strong>Pro Tip:</strong> {guide.proTip}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => toggleExpandCard(guide.id)}
                      className="w-full py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <span>{isExpanded ? 'Show Less' : 'View Full Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION C: GERMAN MANNERS — DO'S AND DON'TS */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                C
              </span>
              <h2 className="text-xl font-bold text-gray-900">German Manners — Do's & Don'ts</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Practical habits at a glance. Distinguishing legal regulations (e.g. quiet hours, tickets) from common social courtesies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DO's */}
            <div className="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-200/70 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-emerald-950 uppercase tracking-wide">
                  What to Do (Recommended Manners)
                </h3>
              </div>
              <ul className="space-y-2.5">
                {dosList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-emerald-950 leading-relaxed">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DON'Ts */}
            <div className="bg-rose-50/40 rounded-2xl p-5 border border-rose-200/70 space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm text-rose-950 uppercase tracking-wide">
                  What to Avoid (Common Pitfalls)
                </h3>
              </div>
              <ul className="space-y-2.5">
                {dontsList.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-rose-950 leading-relaxed">
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      ✕
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION D: INTERACTIVE REAL-LIFE SCENARIOS */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                  D
                </span>
                <h2 className="text-xl font-bold text-gray-900">Interactive Real-Life Scenarios Quiz</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Choose how you would respond in realistic everyday situations. This is an educational guide with immediate feedback.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Explored Scenarios:</span>
              <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                {completedScenariosCount} / {scenarios.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scenarios.map((scen, sIndex) => {
              const isSubmitted = Boolean(submittedScenarios[scen.id]);
              const selectedIdx = selectedAnswers[scen.id];

              return (
                <div
                  key={scen.id}
                  className="rounded-2xl border border-gray-200 p-5 bg-white shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Scenario {sIndex + 1}
                      </span>
                      {isSubmitted && (
                        <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Reviewed</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-gray-900">{scen.title}</h3>
                    <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200 leading-relaxed">
                      {scen.situation}
                    </p>

                    {/* Options list */}
                    <div className="space-y-2 pt-1">
                      {scen.options.map((opt, oIndex) => {
                        const isChosen = selectedIdx === oIndex;

                        return (
                          <button
                            key={oIndex}
                            disabled={isSubmitted}
                            onClick={() => handleSelectOption(scen.id, oIndex)}
                            className={`w-full text-left p-3 rounded-xl text-xs transition-all border ${
                              isSubmitted
                                ? opt.isRecommended
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                  : isChosen
                                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                                  : 'bg-gray-50/50 border-gray-200 text-gray-500 opacity-60'
                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {String.fromCharCode(65 + oIndex)}
                              </span>
                              <span className="leading-relaxed">{opt.text}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback block */}
                    {isSubmitted && (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-gray-200 space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                            Educational Feedback:
                          </span>
                          <button
                            onClick={() => handleRetryScenario(scen.id)}
                            className="text-[10px] font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Try Again</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          {scen.options[selectedIdx]?.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION E: USEFUL GERMAN PHRASES */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                  E
                </span>
                <h2 className="text-xl font-bold text-gray-900">Useful German Phrases Library</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Searchable phrase library with English translations and practical pronunciation guidance for daily life.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={phraseSearch}
                onChange={(e) => setPhraseSearch(e.target.value)}
                placeholder="Search phrases or English..."
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'ALL', label: 'All Categories' },
              { id: 'GREETINGS', label: 'Greetings' },
              { id: 'SHOPPING', label: 'Shopping' },
              { id: 'TRANSIT', label: 'Public Transport' },
              { id: 'UNIVERSITY', label: 'University' },
              { id: 'HOUSING', label: 'Accommodation' },
              { id: 'APPOINTMENTS', label: 'Appointments' },
              { id: 'HELP', label: 'Emergencies & Help' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedPhraseCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all font-medium ${
                  selectedPhraseCategory === cat.id
                    ? 'bg-teal-700 text-white font-bold shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Phrases Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPhrases.map((phrase) => (
              <div
                key={phrase.id}
                className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-teal-200 transition-all space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200 uppercase tracking-wide">
                    {phrase.category}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">{phrase.german}</h4>
                  <p className="text-xs text-gray-600 mt-0.5">{phrase.english}</p>
                </div>

                <div className="pt-2 border-t border-gray-200/80">
                  <span className="text-[10px] uppercase font-bold text-teal-800 block">Pronunciation Aid:</span>
                  <p className="text-xs font-mono text-gray-700 italic mt-0.5">{phrase.pronunciation}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 border border-gray-200 rounded-2xl text-[11px] text-gray-500 leading-relaxed">
            <strong>Pronunciation note:</strong> Text-based pronunciation spellings are designed as friendly phonetic aids for English speakers and are not a full substitute for audio practice. We recommend cross-referencing with audio tools or university language tandems.
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION F: RELIABLE LEARNING RESOURCES */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                F
              </span>
              <h2 className="text-xl font-bold text-gray-900">Reliable Learning Resources & Pre-Departure Guides</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Official, verified external portals from the German Academic Exchange Service (DAAD) and German student support services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900">DAAD: Everyday Life in Germany</h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Official guide by the German Academic Exchange Service covering social life, food, housing, and healthcare.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="https://www.daad.de/ziel-deutschland/pages/en/alltag.html"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                >
                  <span>Visit DAAD Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900">DAAD India: Pre-Departure Guidelines</h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Tailored guidance specifically for Indian students preparing their visa, flight packing, and early days in Germany.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="https://www.daad.in/en/study-research-in-germany/studying-in-germany/pre-departure-guidelines/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                >
                  <span>Visit DAAD India</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900">Make it in Germany: Living Guide</h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Federal government official portal for international professionals and students settling in German cities.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="https://www.make-it-in-germany.com/en/living-in-germany"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                >
                  <span>Visit Make it in Germany</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900">Deutsches Studierendenwerk</h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Federal association of student services offering dormitories, cafeterias, and legal counseling nationwide.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="https://www.studierendenwerke.de/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                >
                  <span>Visit Studierendenwerke</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Optional Educational Advisory Note */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-teal-950">Educational Advisors Available</h4>
              <p className="text-xs text-teal-800 mt-0.5">
                Educational advisors are available anytime via the Consultant tab in the top navigation if you need personalized assistance with housing or visa questions.
              </p>
            </div>
            <Link
              to="/consultant"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition shrink-0 inline-flex items-center gap-1.5 shadow-xs"
            >
              <span>Consultant Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button
            onClick={() => navigate('/journey/exam-prep')}
            className="text-xs text-gray-600 hover:text-gray-900 font-semibold transition"
          >
            ← Back to Exam Preparation
          </button>
          <span className="text-xs text-gray-400">
            Click &quot;Return to My Journey&quot; in the header above to review your roadmap milestones.
          </span>
        </div>
      </main>

      <AgentTracePanel isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} />
    </div>
  );
};
