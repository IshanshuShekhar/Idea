# Educaro Applicant Journey 🇩🇪🇮🇳

> **ImpactX'26 Hackathon • Agentic AI Track**  
> Sponsor: **Educaro Deutschland GmbH**  
> Prototype: Working End-to-End Monorepo (`apps/api`, `apps/web`, `packages/shared`)

An intelligent, agent-driven onboarding platform designed for Indian applicants navigating the pathway to study or work in Germany under **STUDY** (Master's / University admission) and **BLUE_CARD** (Direct IT & Engineering employment) pathways.

---

## 🏛 Core Hard Rules

1. **Strict Field Provenance**:
   - Every profile field carries provenance: `VERIFIED`, `APPLICANT_PROVIDED`, `AI_EXTRACTED`, or `AI_GENERATED`.
   - AI code is architecturally blocked from assigning `VERIFIED`. AI never hallucinates or invents applicant data.
2. **Deterministic Rules Engine**:
   - Eligibility is computed purely via deterministic code and JSON config (`apps/api/src/rules/pathways.json`), evaluating degree level, CEFR German/English, years of experience, and field of study.
   - LLMs only explain results and translate complex German immigration requirements into plain language.
3. **Live Agent Traceability**:
   - Every agent decision and tool invocation writes an audit record to `agent_events` (`agent`, `tool`, `input`, `output`, `confidence`, `timestamp`), polled live by the frontend "What the AI did" panel.

---

## 🤖 LLM Provider Configuration

All LLM operations route through a single unified `LlmService` using the standard `openai` npm package.

- **Methods**: `chatJson(prompt, zodSchema)` with Zod validation and 2 automatic retries; `describeImage()` with vision support.
- **Resilience**: If the LLM provider is offline, the service falls back gracefully to grounded seed data. Flows never crash.
- **Default (Local Ollama)**:
  - `LLM_BASE_URL=http://localhost:11434/v1`
  - `LLM_API_KEY=ollama`
  - `LLM_MODEL=llama3.1`
  - `LLM_VISION_MODEL=qwen2.5vl`
- **Alternative (xAI Grok)**:
  - `LLM_BASE_URL=https://api.x.ai/v1`
  - `LLM_API_KEY=xai-...`
  - `LLM_MODEL=grok-2-latest`
  - `LLM_VISION_MODEL=grok-2-vision-latest`

---

## 🧑‍💻 Demo Persona: Rahul Sharma

A pre-packaged demo persona is provided to demonstrate the full end-to-end journey:
- **Background**: B.Tech in Computer Science from Delhi Technological University (June 2021, CGPA 8.4)
- **Language**: German B1 (Goethe-Zertifikat B1) + English C1
- **Employment**: 3 years experience as a Software Engineer at Infosys Limited
- **Planted Inconsistency**: Experience start date (`2020-07-01`) is before graduation date (`2021-06-30`). The deterministic validator automatically flags this overlap, phrases a clarifying question, and allows 1-click resolution.

---

## 🖥 The 5 Frontend Screens

1. **Chat Intake & Live Agent Trail** (`/journey/chat`):
   - Conversational intake orchestrated deterministically by `OrchestratorService`.
   - Side panel live-polls `agent_events` with real-time logs of tool invocations, inputs, outputs, and latencies.
2. **Document Upload & Review Extracted Fields** (`/journey/documents`):
   - Upload Degree, Language Certificate, Experience Letter, or CV.
   - Text extraction via `pdf-parse` (or vision fallback). Applicant confirms/edits fields, immediately switching provenance from `AI_EXTRACTED` to `APPLICANT_PROVIDED`.
3. **Structured Profile & Completeness Bar** (`/candidate-details` or `/profile`):
   - 10 entities (Personal, Education, Employment, Skills, Languages, Documents, Motivation, Media, Qualification, RecommendedJourney).
   - Provenance badges on every field with pure code completeness % computation.
4. **Qualification Results** (`/journey/qualification`):
   - Deterministic status (`ELIGIBLE` / `PARTIAL` / `NOT_YET`), passed/missing checklist, and consultant assumptions.
   - LLM-grounded explanation citing specific passed/failed criteria.
5. **Recommended Next Steps & CV Generator** (`/journey/next-steps` & `/journey/cv`):
   - Next best action mapped from pathway & status to Educaro service packages or consultant referrals.
   - Professional German-format Lebenslauf/CV generated from real profile data with provenance tags and 1-click `window.print()` PDF download.

---

## 🚀 Running the Prototype

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Build Packages
```bash
# Build shared types
pnpm --filter @educaro/shared build

# Build API and Web
pnpm --filter api build
pnpm --filter web build
```

### 3. Seed Demo Persona
```bash
# Seed Rahul Sharma persona with planted date inconsistency
pnpm --filter api seed
```

### 4. Start Development Servers
```bash
# Option A: Start both concurrently
pnpm dev

# Option B: Run separately
# Terminal 1: Backend API (port 3001)
cd apps/api && pnpm dev

# Terminal 2: Frontend Web (port 5173)
cd apps/web && pnpm dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001/api](http://localhost:3001/api)
- **API Health Check**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **Demo Fast Login**: Click **"Applicant (Rahul Sharma)"** on the login page for 1-click entry.
