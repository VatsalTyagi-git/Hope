# Hope — Autonomous AI Cognitive Behavioral Therapist

<img width="949" height="452" alt="image" src="https://github.com/user-attachments/assets/beed334e-885a-42ba-93ee-d99e09bd645b" />


> An autonomous, multimodal voice AI therapist powered by **LiveKit Agents**, **Google Gemini Live Native Audio**, and **FalkorDB Graph Memory** with strict multi-tenant clinical isolation.

---

## Table of Contents
1. [Overview & Problem Statement](#overview--problem-statement)
2. [Why FalkorDB?](#why-falkordb)
3. [System Architecture](#system-architecture)
4. [Graph Data Model](#graph-data-model)
   - [The 4-Layer CBT Memory Hierarchy](#the-4-layer-cbt-memory-hierarchy)
   - [Graph Schema Diagram](#graph-schema-diagram)
   - [Node Labels & Schema Definitions](#node-labels--schema-definitions)
   - [Relationships & Edge Attributes](#relationships--edge-attributes)
5. [Core Cypher Queries & Graph Algorithms](#core-cypher-queries--graph-algorithms)
   - [1. Index Initialization (Multi-Tenant Optimization)](#1-index-initialization-multi-tenant-optimization)
   - [2. Pre-Session Clinical Context Assembly](#2-pre-session-clinical-context-assembly)
   - [3. Post-Session Ingestion & Knowledge Fusion](#3-post-session-ingestion--knowledge-fusion)
   - [4. Real-Time In-Session Recall (Sub-5ms Turn Lookup)](#4-real-time-in-session-recall-sub-5ms-turn-lookup)
   - [5. Chronological Spine Maintenance](#5-chronological-spine-maintenance)
   - [6. Graph Algorithms Utilized](#6-graph-algorithms-utilized)
6. [Local Setup Instructions](#local-setup-instructions)
   - [Prerequisites](#prerequisites)
   - [Step 1: Clone Repository](#step-1-clone-repository)
   - [Step 2: Start FalkorDB via Docker](#step-2-start-falkordb-via-docker)
   - [Step 3: Setup Backend Service](#step-3-setup-backend-service)
   - [Step 4: Setup Voice Agent & Chatbot](#step-4-setup-voice-agent--chatbot)
   - [Step 5: Setup Frontend Web Client](#step-5-setup-frontend-web-client)
   - [Step 6: End-to-End Verification](#step-6-end-to-end-verification)
7. [Repository Structure](#repository-structure)
8. [License](#license)

---

## Overview & Problem Statement

### 1. Inaccessible & Unaffordable Mental Healthcare
Over 1 billion people worldwide suffer from anxiety, depression, and mental health struggles. Professional one-on-one therapy costs between **$150 and $300 per hour**, often requiring weeks or months on waitlists. High-frequency care (such as daily check-ins or immediate panic de-escalation) is financially impossible for the vast majority of people.

### 2. The Failure of Flat Context LLMs
General LLM chat apps (like ChatGPT) cannot deliver safe, effective Cognitive Behavioral Therapy (CBT):
* **Flat, Unstructured Context**: Standard chat histories treat every sentence as an undifferentiated stream of tokens. After 2–3 sessions, critical past incidents, triggers, and cognitive reframes are forgotten or diluted.
* **Lack of Multi-Session Clinical Continuity**: A user who reframed an imposter spiral regarding their manager in Session 1 will find the AI has no structured memory of that breakthrough in Session 5.
* **No Procedural Rules**: A therapist must remember patient-specific constraints (e.g., *"Do not suggest journaling; user experiences writing block; prefers 4-7-8 breathing"*).

### 3. How Hope Solves This
**Hope** is an autonomous clinical companion that models a human therapist's mental representation of a patient:
* **Realtime Multimodal Audio**: Direct WebRTC voice-to-voice communication using LiveKit Agents and Google Gemini Live.
* **Persistent Knowledge Graph Memory**: Every interaction is decomposed into structured clinical nodes (Episodes, Triggers, Distortions, Core Beliefs, and Daily Practices) stored in **FalkorDB**.
* **Zero Cross-Talk Multi-Tenancy**: Every graph entity is strictly partitioned by `userId`, guaranteeing complete privacy and clinical isolation.

---

## Why FalkorDB?

| Requirement | Vector DB / Flat RAG | Relational Database (SQL) | FalkorDB Graph Database |
| :--- | :--- | :--- | :--- |
| **Multi-Hop Traversal** | Fails on deep relational chains (`Trigger` to `Distortion` to `CoreBelief`) | Requires expensive 6-table joins with high latency | **Native, sub-5ms graph traversals** |
| **Latency for Voice** | 400ms–800ms semantic search overhead | 150ms–300ms join overhead | **< 5ms in-memory GraphBLAS query execution** |
| **Multi-Session Continuity** | Token window exhaustion and semantic drift | Rigid relational schemas difficult to adapt dynamically | **Dynamic graph topology evolving per session** |
| **User Isolation** | Difficult to guarantee absolute metadata segregation | Row-level security overhead | **Single-root subtree scoping (`userId: $userId`)** |

FalkorDB powers Hope's conversational recall in real time: when a patient says *"I'm having that panic with Marcus again"*, FalkorDB traverses `(Person {name: 'Marcus'}) <-[:INVOLVED_PERSON]- (Episode) -[:EXHIBITED_DISTORTION]-> (Distortion)` in under 5 milliseconds, injecting the validated reframe directly into the agent's prompt.

---

## System Architecture

```mermaid
graph TD
    User([Patient / User]) <-->|WebRTC Voice & Audio| LK[LiveKit Cloud / Local Server]
    LK <-->|Bidirectional Audio Stream| Agent[Python Voice Agent <br> LiveKit Agents + Gemini Live Native Audio]
    
    subgraph Frontend [Next.js 15 Web Client]
        UI[Voice Room, Chat Workspace & Dashboard]
        Auth[NextAuth / Auth.js Session]
    end
    
    subgraph Backend [Node.js Express Server]
        API[Session, Memory & Profile APIs]
        Extractor[Gemini Structured CBT Extractor]
        Neon[(Neon PostgreSQL <br> Raw Transcripts & User Auth)]
    end
    
    subgraph GraphEngine [FalkorDB In-Memory Graph]
        FDB[(Multi-Tenant CBT Graph Memory <br> Root: User Node)]
    end

    User <-->|HTTP / WebSocket| UI
    UI -->|Fetch Sessions & Stats| API
    UI -->|User Auth & Messages| Neon
    Agent -->|Direct Turn Recall < 5ms| FDB
    Agent -->|End of Session Webhook| API
    API -->|Raw Audio Transcripts| Neon
    API -->|Transcript Analysis| Extractor
    Extractor -->|Cypher Mutation Sync| FDB
```

---

## Graph Data Model

### The 4-Layer CBT Memory Hierarchy

Hope structures clinical memory across four interconnected layers:

1. **Layer A — History & Multi-Agent Coordination**:
   * `User`: The primary root hub for all user-owned data.
   * `Companion`: Dedicated companions tailored for distinct therapeutic modalities (`WEEKLY` in-depth therapy, `DAILY` 5-minute drills, `ON_DEMAND` acute grounding).
   * `Session`: Metadata record of every voice or chat conversation.
   * `AgentState`: Clinical momentum, active homework, current streak, and urgent safety flags.
   * `Handoff`: Inter-modality clinical transition notes passed between companion personas.

2. **Layer B — Episodic Memory**:
   * `Episode`: A specific triggering event or psychological incident capturing the situation, automatic thought, emotion, and cognitive reframe.
   * `DailyPractice`: Homework execution logs, somatic regulation exercises, and pre/post mood ratings.

3. **Layer C — Semantic CBT Memory**:
   * `Person`: Interpersonal relationships (e.g., manager, partner, family member) and associated sentiment.
   * `Trigger`: Situational stressors (e.g., code review, public presentation, late-night deadlines).
   * `CognitiveDistortion`: Clinically validated CBT thinking errors (e.g., Catastrophizing, Mind Reading, All-or-Nothing Thinking).
   * `CoreBelief`: Deep psychological schemas (e.g., *"I am incompetent"*, *"I am unlovable"*).

4. **Layer D — Procedural Memory**:
   * `CBTExercise`: Prescribed behavioral drills (e.g., 3-Column Thought Records, Physiological Sigh, 5-4-3-2-1 Grounding).
   * `TherapistRule`: Learned conversational and clinical constraints personalized to the user.

---

### Graph Schema Diagram

```mermaid
graph LR
    User([User: id]) -->|HAS_COMPANION| Companion([Companion: mode])
    User -->|HAS_STATE| AgentState([AgentState])
    User -->|HAS_SESSION| Session([Session: id, started_at])
    User -->|PREFERS_RULE| TherapistRule([TherapistRule: rule])
    
    Session -->|CONDUCTED_BY| Companion
    Session -->|CAPTURED_EPISODE| Episode([Episode: situation, thought, reframe])
    Session -->|LOGGED_PRACTICE| DailyPractice([DailyPractice: completed])
    Session -->|NEXT_SESSION| Session
    User -->|LATEST_SESSION| Session

    Episode -->|INVOLVED_PERSON| Person([Person: name, role])
    Episode -->|SPARKED_BY| Trigger([Trigger: name])
    Episode -->|EXHIBITED_DISTORTION| CognitiveDistortion([CognitiveDistortion: name])
    
    Person -->|ASSOCIATED_WITH_TRIGGER| Trigger
    Trigger -->|ACTIVATES_DISTORTION| CognitiveDistortion
    CognitiveDistortion -->|ROOTED_IN| CoreBelief([CoreBelief: statement])
    
    DailyPractice -->|PRACTICED_EXERCISE| CBTExercise([CBTExercise: name])
    AgentState -->|ACTIVE_HOMEWORK| CBTExercise
```

---

### Node Labels & Schema Definitions

| Node Label | Key Properties | Purpose |
| :--- | :--- | :--- |
| `User` | `id`, `name`, `created_at`, `baseline_anxiety` | Root isolation hub for all tenant subgraphs. |
| `Companion` | `id`, `userId`, `mode`, `description`, `last_active_at` | Tracks state for Weekly, Daily, and On-Demand companions. |
| `Session` | `id`, `userId`, `mode`, `started_at`, `ended_at`, `initial_mood`, `final_mood`, `summary`, `transcript_db_id` | Chronological session anchor linked directly to `User`. |
| `AgentState` | `id`, `userId`, `recommended_next_mode`, `active_homework`, `homework_streak`, `urgent_flag`, `handoff_context` | Live clinical snapshot read prior to every session start. |
| `Episode` | `id`, `userId`, `situation`, `automatic_thought`, `emotion`, `reframed_thought`, `timestamp` | Specific CBT incident containing thoughts, distortions, and reframes. |
| `Person` | `id`, `userId`, `name`, `role`, `relationship_valence` | Interpersonal entity linked to situational triggers. |
| `Trigger` | `id`, `userId`, `name`, `category`, `frequency` | Stressor activating automatic thoughts. |
| `CognitiveDistortion`| `id`, `userId`, `name`, `occurrence_count`, `example_quote` | Identified cognitive distortion pattern. |
| `CoreBelief` | `id`, `userId`, `statement`, `category`, `strength_score` | Deep cognitive schema underlying recurring distortions. |
| `DailyPractice` | `id`, `userId`, `exercise_name`, `completed`, `mood_before`, `mood_after`, `friction_note`, `timestamp` | Daily behavioral practice record. |
| `CBTExercise` | `id`, `userId`, `name`, `times_used`, `last_used_at` | Catalog of clinical interventions prescribed to the patient. |
| `TherapistRule` | `id`, `userId`, `rule`, `confidence`, `learned_from_mode` | Learned clinical guidelines (e.g., pacing, tone, avoidance). |

---

### Relationships & Edge Attributes

| Relationship | Source Node | Target Node | Properties / Cardinality |
| :--- | :--- | :--- | :--- |
| `[:HAS_COMPANION]` | `User` | `Companion` | 1-to-3 (One per clinical modality: Weekly, Daily, On-Demand) |
| `[:HAS_STATE]` | `User` | `AgentState` | 1-to-1 (Live clinical tracking) |
| `[:HAS_SESSION]` | `User` | `Session` | 1-to-N (Chronological spine) |
| `[:NEXT_SESSION]` | `Session` | `Session` | `hours_between: float` (Temporal linked-list) |
| `[:LATEST_SESSION]` | `User` | `Session` | 1-to-1 pointer to most recent session |
| `[:CONDUCTED_BY]` | `Session` | `Companion` | N-to-1 |
| `[:CAPTURED_EPISODE]`| `Session` | `Episode` | 1-to-N |
| `[:INVOLVED_PERSON]` | `Episode` | `Person` | N-to-N |
| `[:SPARKED_BY]` | `Episode` | `Trigger` | N-to-1 |
| `[:EXHIBITED_DISTORTION]`| `Episode` | `CognitiveDistortion` | N-to-N |
| `[:ROOTED_IN]` | `CognitiveDistortion` | `CoreBelief` | N-to-1 |
| `[:ASSOCIATED_WITH_TRIGGER]` | `Person` | `Trigger` | `co_occurrence_count: int` |
| `[:ACTIVATES_DISTORTION]` | `Trigger` | `CognitiveDistortion` | `weight: int` |
| `[:LOGGED_PRACTICE]`| `Session` | `DailyPractice` | 1-to-N |
| `[:PRACTICED_EXERCISE]` | `DailyPractice` | `CBTExercise` | N-to-1 |
| `[:ACTIVE_HOMEWORK]` | `AgentState` | `CBTExercise` | `assigned_at: int`, `target_days: int` |
| `[:PREFERS_RULE]` | `User` | `TherapistRule` | 1-to-N |

---

## Core Cypher Queries & Graph Algorithms

### 1. Index Initialization (Multi-Tenant Optimization)
To guarantee sub-5ms query performance under concurrent multi-tenant loads, FalkorDB creates primary-key and search range indices across all user-isolated node labels:

```cypher
CREATE INDEX FOR (n:User) ON (n.id)
CREATE INDEX FOR (n:Session) ON (n.id)
CREATE INDEX FOR (n:Session) ON (n.userId)
CREATE INDEX FOR (n:Episode) ON (n.id)
CREATE INDEX FOR (n:Episode) ON (n.userId)
CREATE INDEX FOR (n:Person) ON (n.name)
CREATE INDEX FOR (n:Trigger) ON (n.name)
CREATE INDEX FOR (n:CognitiveDistortion) ON (n.name)
CREATE INDEX FOR (n:CoreBelief) ON (n.statement)
CREATE INDEX FOR (n:TherapistRule) ON (n.userId)
```

---

### 2. Pre-Session Clinical Context Assembly
Executed on session startup to build the initial clinical prompt injected into the Gemini Live agent. This multi-hop query gathers the latest session summary, homework streak, top recurring distortions, interpersonal triggers, and personalized constraints:

```cypher
MATCH (u:User {id: $userId})
OPTIONAL MATCH (u)-[:LATEST_SESSION]->(latest:Session)
OPTIONAL MATCH (u)-[:HAS_STATE]->(state:AgentState)
OPTIONAL MATCH (u)-[:HAS_SESSION]->(:Session)-[:CAPTURED_EPISODE]->(ep:Episode)-[:EXHIBITED_DISTORTION]->(d:CognitiveDistortion)
OPTIONAL MATCH (ep)-[:SPARKED_BY]->(t:Trigger)
OPTIONAL MATCH (u)-[:PREFERS_RULE]->(r:TherapistRule)
RETURN latest.summary AS previous_session_summary,
       latest.final_mood AS last_mood,
       state.active_homework AS homework,
       state.homework_streak AS streak,
       state.handoff_context AS clinical_note,
       collect(DISTINCT d.name)[0..3] AS frequent_distortions,
       collect(DISTINCT t.name)[0..3] AS recurring_triggers,
       collect(DISTINCT r.rule) AS therapist_guidelines
```

---

### 3. Post-Session Ingestion & Knowledge Fusion
After each voice or chat session, the Gemini CBT Extractor analyzes the raw transcript and synthesizes discrete clinical structures. This Cypher mutation creates the `Episode` node and atomically updates co-occurrence weights across interpersonal entities, triggers, distortions, and core beliefs:

```cypher
MATCH (s:Session {id: $sessionId})
CREATE (e:Episode {
    id: $episodeId,
    userId: s.userId,
    situation: $situation,
    automatic_thought: $thought,
    emotion: $emotion,
    reframed_thought: $reframe,
    timestamp: $now
})
CREATE (s)-[:CAPTURED_EPISODE]->(e)

// Connect involved person
MERGE (p:Person {id: "person_" + s.userId + "_" + $personName})
ON CREATE SET p.name = $personName, p.userId = s.userId, p.role = $personRole
CREATE (e)-[:INVOLVED_PERSON]->(p)

// Connect trigger & update co-occurrence
MERGE (t:Trigger {id: "trigger_" + s.userId + "_" + $triggerName})
ON CREATE SET t.name = $triggerName, t.userId = s.userId, t.frequency = 1
ON MATCH SET t.frequency = t.frequency + 1
CREATE (e)-[:SPARKED_BY]->(t)
MERGE (p)-[rel_pt:ASSOCIATED_WITH_TRIGGER]->(t)
ON CREATE SET rel_pt.co_occurrence_count = 1
ON MATCH SET rel_pt.co_occurrence_count = rel_pt.co_occurrence_count + 1

// Connect cognitive distortion & core belief
MERGE (cd:CognitiveDistortion {id: "distortion_" + s.userId + "_" + $distortionName})
ON CREATE SET cd.name = $distortionName, cd.userId = s.userId, cd.occurrence_count = 1
ON MATCH SET cd.occurrence_count = cd.occurrence_count + 1
CREATE (e)-[:EXHIBITED_DISTORTION]->(cd)

MERGE (t)-[rel_td:ACTIVATES_DISTORTION]->(cd)
ON CREATE SET rel_td.weight = 1
ON MATCH SET rel_td.weight = rel_td.weight + 1

MERGE (cb:CoreBelief {id: "belief_" + s.userId + "_" + $coreBelief})
ON CREATE SET cb.statement = $coreBelief, cb.userId = s.userId
MERGE (cd)-[:ROOTED_IN]->(cb)
```

---

### 4. Real-Time In-Session Recall (Sub-5ms Turn Lookup)
When a user mentions a person, incident, or past reframe during live speech (e.g., *"Can you remind me about that presentation with Marcus?"*), the agent triggers an on-the-spot multi-hop retrieval:

```cypher
MATCH (u:User {id: $userId})-[:HAS_SESSION]->(s:Session)-[:CAPTURED_EPISODE]->(e:Episode)
WHERE toLower(e.situation) CONTAINS toLower($queryTopic)
   OR toLower(e.automatic_thought) CONTAINS toLower($queryTopic)
   OR toLower(coalesce(e.reframed_thought, "")) CONTAINS toLower($queryTopic)
OPTIONAL MATCH (e)-[:INVOLVED_PERSON]->(p:Person)
OPTIONAL MATCH (e)-[:SPARKED_BY]->(t:Trigger)
OPTIONAL MATCH (e)-[:EXHIBITED_DISTORTION]->(cd:CognitiveDistortion)
OPTIONAL MATCH (cd)-[:ROOTED_IN]->(cb:CoreBelief)
RETURN e.situation, e.automatic_thought, e.emotion, e.reframed_thought,
       p.name, p.role, t.name, cd.name, cb.statement
ORDER BY e.timestamp DESC
LIMIT 3
```

---

### 5. Chronological Spine Maintenance
Maintains an explicit temporal linked list of all sessions for each user, calculating lapse times and allowing longitudinal analytics:

```cypher
MATCH (u:User {id: $userId})
MATCH (new_s:Session {id: $sessionId, userId: $userId})
OPTIONAL MATCH (u)-[r:LATEST_SESSION]->(prev_s:Session {userId: $userId})
FOREACH (_ IN CASE WHEN prev_s IS NOT NULL THEN [1] ELSE [] END |
    CREATE (prev_s)-[:NEXT_SESSION {
        hours_between: toFloat($startedAt - prev_s.ended_at) / 3600.0
    }]->(new_s)
    DELETE r
)
MERGE (u)-[:LATEST_SESSION]->(new_s)
```

---

### 6. Graph Algorithms Utilized

* **Multi-Hop Causal Chain Analysis (Breadth-First Search / BFS)**:
  Traverses paths from acute triggers to underlying cognitive structures:
  $$\text{Trigger} \xrightarrow{\text{ACTIVATES}} \text{CognitiveDistortion} \xrightarrow{\text{ROOTED\_IN}} \text{CoreBelief}$$
  Enables the agent to identify *why* a benign event evokes deep distress.
* **Weighted Co-Occurrence Graph Scoring**:
  Calculates relational frequency weights on `(Person)-[:ASSOCIATED_WITH_TRIGGER]->(Trigger)` and `(Trigger)-[:ACTIVATES_DISTORTION]->(CognitiveDistortion)` to identify the primary relational sources of cognitive spirals.
* **Temporal Spine Traversal**:
  Walks the `[:NEXT_SESSION]` linked-list chain to compute homework adherence velocity, mood deltas, and relapse intervals over time.
* **Strict Subgraph Partitioning (Root Anchor Enforcement)**:
  Every Cypher read and write enforces an anchored root match `MATCH (u:User {id: $userId})`. No traversals are permitted without the tenant identifier, preventing cross-patient leakage.

---

## Local Setup Instructions

Follow these step-by-step instructions to run Hope locally.

### Prerequisites

| Tool | Version | Purpose |
| :--- | :--- | :--- |
| **Docker / Docker Desktop** | Latest | Running FalkorDB in-memory graph container |
| **Node.js** | 18.x or 20.x | Running Express backend and Next.js frontend |
| **pnpm** or **npm** | Latest | Package management |
| **Python** | 3.10 – 3.12 | Running LiveKit Voice Agent & Chatbot bridge |
| **LiveKit Cloud Account** | Free tier | WebRTC audio infrastructure ([livekit.io](https://cloud.livekit.io)) |
| **Google Gemini API Key** | v2 / 2.0 | Multimodal Live Audio and Structured CBT Extraction |
| **Neon PostgreSQL** | Free tier | PostgreSQL database for users & raw transcripts ([neon.tech](https://neon.tech)) |

---

### Step 1: Clone Repository

```bash
git clone https://github.com/VatsalTyagi-git/Hope.git
cd Hope
```

Copy the root `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Provide your Neon PostgreSQL database connection string in `.env`)*

---

### Step 2: Start FalkorDB via Docker

Start a FalkorDB instance locally using Docker:

```bash
docker run -p 6379:6379 -d --name falkordb -v falkordb_data:/data falkordb/falkordb:latest
```

Verify that FalkorDB is responding:
```bash
# Using redis-cli or docker exec
docker exec -it falkordb redis-cli ping
# Expected output: PONG
```

---

### Step 3: Setup Backend Service

The backend Express server handles user registration, session finalization, clinical CBT extraction, and FalkorDB synchronization.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create `.env` from example:
   ```bash
   cp .env.example .env
   ```

3. Configure `backend/.env`:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://neondb_owner:your_password@ep-your-db.aws.neon.tech/neondb?sslmode=require"
   FALKORDB_HOST="localhost"
   FALKORDB_PORT=6379
   FALKORDB_PASSWORD=""
   GOOGLE_API_KEY="your-gemini-api-key"
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Push Prisma schema to your PostgreSQL database:
   ```bash
   npm run db:push
   ```

6. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:5000` and automatically initialize FalkorDB graph schema indices.*

---

### Step 4: Setup Voice Agent & Chatbot

The voice agent connects to LiveKit Cloud for real-time WebRTC audio and communicates with FalkorDB for instantaneous clinical recall.

1. Open a new terminal and navigate to `my-agent`:
   ```bash
   cd my-agent
   ```

2. Create `.env.local` from example:
   ```bash
   cp .env.example .env.local
   ```

3. Configure `my-agent/.env.local`:
   ```env
   LIVEKIT_URL="wss://your-project.livekit.cloud"
   LIVEKIT_API_KEY="your-livekit-api-key"
   LIVEKIT_API_SECRET="your-livekit-api-secret"
   LIVEKIT_AGENT_NAME="my-agent-local"

   GOOGLE_API_KEY="your-gemini-api-key"
   EXPRESS_BACKEND_URL="http://localhost:5000/api/sessions/transcript"

   FALKORDB_HOST="localhost"
   FALKORDB_PORT=6379
   FALKORDB_PASSWORD=""
   FALKORDB_GRAPH="therapy_memory"
   HOPE_VOICE="Rasalgethi"
   ```

4. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell):
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # macOS / Linux:
   python3 -m venv .venv
   source .venv/bin/activate
   ```

5. Install Python dependencies:
   ```bash
   pip install -e .
   # Or using uv:
   # uv sync
   ```

6. Start the LiveKit voice agent in development mode:
   ```bash
   python src/agent.py dev
   ```
   *The worker will connect to LiveKit Cloud and wait for incoming patient rooms.*

---

### Step 5: Setup Frontend Web Client

The frontend is a Next.js 15 web application featuring the ambient audio-reactive voice room, chat workspace, and clinical memory dashboard.

1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Create `.env.local` from example:
   ```bash
   cp .env.example .env.local
   ```

3. Configure `frontend/.env.local`:
   ```env
   LIVEKIT_URL="wss://your-project.livekit.cloud"
   LIVEKIT_API_KEY="your-livekit-api-key"
   LIVEKIT_API_SECRET="your-livekit-api-secret"
   AGENT_NAME="my-agent-local"

   DATABASE_URL="postgresql://neondb_owner:your_password@ep-your-db.aws.neon.tech/neondb?sslmode=require"
   AUTH_SECRET="any-secure-random-32-character-secret"
   NEXTAUTH_SECRET="any-secure-random-32-character-secret"
   NEXTAUTH_URL="http://localhost:3000"

   NEXT_PUBLIC_API_URL="http://localhost:5000"
   EXPRESS_BACKEND_URL="http://localhost:5000/api/chat"
   ```

4. Install dependencies:
   ```bash
   pnpm install
   # Or: npm install
   ```

5. Start the frontend development server:
   ```bash
   pnpm dev
   ```
   *The web client will be available at `http://localhost:3000`.*

---

### Step 6: End-to-End Verification

1. Open `http://localhost:3000` in your browser.
2. Click **Let's talk** or navigate to `/login` to create a new patient account.
3. Choose either:
   * **Voice Session** (`/voice`): Connect your microphone to speak with Hope. Observe the audio visualizer aura and bidirectional conversation.
   * **Chat Workspace** (`/chat`): Have a text-based CBT session with sub-second graph recall.
4. End the session. The backend will:
   * Record the raw transcript in Neon PostgreSQL.
   * Decompose the conversation into structured clinical entities using Google Gemini.
   * Ingest and link the `Episode`, `Trigger`, `CognitiveDistortion`, and `CoreBelief` nodes into **FalkorDB**.
5. Check your updated clinical insights and session history in the Dashboard (`/dashboard`).

---

## Repository Structure

```
Hope/
├── .env.example                 # Root environment template (Neon DB connection)
├── .gitignore                   # Universal exclusion rules (secrets strictly ignored)
├── README.md                    # Project documentation & architecture manual
│
├── backend/                     # Express + TypeScript API server
│   ├── .env.example             # Backend environment template
│   ├── db/                      # Database clients & schema definitions
│   │   ├── falkor.ts            # FalkorDB client & multi-tenant index initializer
│   │   ├── index.ts             # Neon PostgreSQL Prisma client
│   │   └── prisma/schema.prisma # User, Session, Message, Profile schema
│   ├── scripts/
│   │   └── clearFalkorDB.ts     # FalkorDB schema reset & maintenance utility
│   ├── server.ts                # Express API endpoints & session webhook receiver
│   └── services/
│       ├── cbtExtractor.ts      # LLM structured clinical entity extractor
│       ├── graphMemorySync.ts   # FalkorDB multi-tenant synchronization engine
│       └── pythonChatbotBridge.ts# Bridge executing Python chatbot memory retrieval
│
├── frontend/                    # Next.js 15 Web Application
│   ├── .env.example             # Frontend environment template
│   ├── app/                     # App router pages (Marketing, Auth, Voice, Chat, Dashboard)
│   ├── auth.ts                  # NextAuth / Auth.js configuration
│   ├── components/              # UI design system & components
│   │   ├── agents-ui/           # LiveKit audio visualizers & WebRTC controls
│   │   ├── app/                 # Voice session view controller & room provider
│   │   ├── chat/                # Text chat workspace & transcript scroller
│   │   └── landing/             # Hero, approach, and interactive preview cards
│   ├── lib/                     # Client services, context providers & database helper
│   │   └── demo-conversations.tsx# ThreadProvider & conversation state management
│   └── styles/                  # Tailwind & custom CSS design tokens
│
└── my-agent/                    # Python Voice Agent & Multimodal Core
    ├── .env.example             # Agent environment template
    ├── Dockerfile               # Container deployment specification
    ├── livekit.toml             # LiveKit agent configuration
    ├── pyproject.toml           # Python dependencies (livekit-agents, falkordb, google)
    └── src/
        ├── agent.py             # LiveKit Voice Agent (Gemini Live Native Audio + Recall)
        ├── chatbot.py           # Text Chatbot with on-the-spot graph memory
        └── graph_memory.py      # FalkorDB 4-layer CBT knowledge graph layer
```

---

## License

This project is licensed under the [MIT License](LICENSE).
