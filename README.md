# 🌐 Rise Defense Systems (RDS) — Revbot RAG Intelligence Platform

> **Production RevOps AI Assistant & Vector Knowledge Engine** powered by **Next.js 16**, **Neon Serverless Postgres (`pgvector`)**, **LangGraph Orchestration**, and **Real-Time RTL Audio Processing**.

---

## 🏛️ System Architecture Map

```mermaid
flowchart TB
    subgraph ClientLayer["🖥️ Presentation & Client Layer"]
        UI["Revbot Next.js UI (React 19 / Tailwind CSS 4)"]
        Tab1["🤖 Revbot Copilot Chat"]
        Tab2["📻 RDS RTL Audio Intelligence"]
        Tab3["📥 RAG Knowledge Ingestion"]
        Tab4["🔍 Neon Vector Inspector"]
        
        UI --> Tab1
        UI --> Tab2
        UI --> Tab3
        UI --> Tab4
    end

    subgraph APILayer["⚡ Next.js API Routes & Orchestration Layer"]
        direction TB
        LangGraphRoute["/api/langgraph (POST)<br/>Thread & Agent Runner"]
        RAGQueryRoute["/api/rag/query (POST)<br/>Vector Similarity Search"]
        RAGIngestRoute["/api/rag/ingest (POST)<br/>Chunking & Embedding Indexer"]
        AudioRoute["/api/audio (GET / POST)<br/>RTL Stream Telemetry & Sync"]
        CronRevOps["/api/cron/revops (GET)<br/>Vercel Scheduled Automation"]
        CronHealth["/api/cron/health (GET)<br/>Liveness Probe"]
        HealthRoute["/api/health (GET)<br/>Neon DB & Table Diagnostic"]
    end

    subgraph AgentLayer["🧠 AI & Agentic Orchestration"]
        LGDev["LangGraph Dev Server (http://127.0.0.1:2024)"]
        LGAgent["Graph Agent Workflow"]
        GeminiAPI["Google GenAI / LLM API"]
        
        LGDev --> LGAgent
        LGAgent --> GeminiAPI
    end

    subgraph DatabaseLayer["🐘 Data & Vector Storage Layer (Neon Postgres)"]
        NeonDriver["@neondatabase/serverless (HTTP Pooling / Sub-25ms)"]
        
        subgraph Tables["PostgreSQL 17 + pgvector Extension"]
            T_Docs["📄 documents<br/>id, title, source, metadata, created_at"]
            T_Chunks["🧩 document_chunks<br/>id, document_id, content, chunk_index, embedding vector(1536), metadata"]
            T_Reports["📊 revops_reports<br/>id, trigger, status, report jsonb, duration_ms, created_at"]
            SP_Match["⚡ Stored Procedure: match_document_chunks()<br/>HNSW Cosine Similarity ANN Search"]
        end
        
        NeonDriver --> Tables
    end

    subgraph IngestionExternal["🔄 External Triggers & Integrations"]
        VercelCron["⏰ Vercel Cron Scheduler (Every 6h / 10:00 UTC)"]
        RDSPortal["🎙️ rdsrevops.com Audio Feeds & Portal"]
    end

    %% Flow Connections
    Tab1 -->|Query & RAG Context| LangGraphRoute
    Tab1 -.->|Fallback RAG| RAGQueryRoute
    Tab2 -->|Fetch / Sync Transcripts| AudioRoute
    Tab2 -->|Index Transcripts| RAGIngestRoute
    Tab3 -->|Submit SOPs / Docs| RAGIngestRoute
    Tab4 -->|Similarity Inspection| RAGQueryRoute

    LangGraphRoute -->|ANN Search| SP_Match
    LangGraphRoute -->|Dispatch Prompt + Vector Context| LGDev
    RAGQueryRoute -->|Execute match_document_chunks| SP_Match
    RAGIngestRoute -->|Insert Doc & Vector Chunks| T_Docs
    RAGIngestRoute -->|Insert Chunks| T_Chunks
    AudioRoute -->|Stream Audio Tracks| RDSPortal
    
    VercelCron -->|Bearer Auth /api/cron/revops| CronRevOps
    CronRevOps -->|Trigger AI Workflow| LGDev
    CronRevOps -->|Log Pipeline Execution| T_Reports
    HealthRoute -->|Inspect Information Schema| NeonDriver
```

---

## 🔄 Core Data & Execution Flows

### 1. Vector Search & RAG Flow (Revbot Copilot)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 RevOps User
    participant UI as 💻 Revbot UI
    participant API as 🚀 /api/langgraph
    participant RAG as 📚 lib/rag.ts
    participant DB as 🐘 Neon pgvector
    participant LG as 🧠 LangGraph Server

    User->>UI: Enter Revenue Optimization Query
    UI->>API: POST { prompt, threadId }
    API->>RAG: querySimilarChunks(queryVector, threshold=0.0, topK=3)
    RAG->>DB: SELECT * FROM match_document_chunks()
    DB-->>RAG: Top 3 Cosine Matched Chunks
    RAG-->>API: DocumentChunkMatch[]
    API->>LG: client.runs.create(threadId, 'agent', { augmentedPrompt })
    LG-->>API: Agent Response & Reasoning Run
    API-->>UI: Return JSON { threadId, runId, status, ragMatches, output }
    UI-->>User: Render Bot Answer with Interactive Vector Citations
```

### 2. Knowledge Ingestion & Chunking Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 👤 RevOps Admin
    participant IngestUI as 📥 Ingestion Form
    participant IngestAPI as 🚀 /api/rag/ingest
    participant ChunkLib as ✂️ chunkText() [lib/rag.ts]
    participant Neon as 🐘 Neon Postgres

    Admin->>IngestUI: Enter Title, Category, Source, & Document Content
    IngestUI->>IngestAPI: POST { title, source, metadata, content }
    IngestAPI->>Neon: INSERT INTO documents RETURNING id
    Neon-->>IngestAPI: documentId (#12)
    IngestAPI->>ChunkLib: chunkText(content, maxChunkWords=300, overlapWords=50)
    ChunkLib-->>IngestAPI: Array of overlapping text chunks
    IngestAPI->>Neon: INSERT INTO document_chunks (embedding::vector, content, metadata)
    Neon-->>IngestAPI: Chunks successfully indexed in HNSW index
    IngestAPI-->>IngestUI: { success: true, documentId: 12, chunksCreated: 8 }
```

### 3. Vercel Cron Automated Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant VC as ⏰ Vercel Cron
    participant CronAPI as ⚙️ /api/cron/revops
    participant LG as 🧠 LangGraph Service
    participant Neon as 🐘 Neon revops_reports

    VC->>CronAPI: GET /api/cron/revops (Bearer CRON_SECRET)
    CronAPI->>CronAPI: Validate Authorization Header
    CronAPI->>LG: POST /run-workflow { trigger: 'scheduled_revops_sync' }
    LG-->>CronAPI: Workflow Output & Revenue Sync Payload
    CronAPI->>Neon: INSERT INTO revops_reports (trigger, status, report, duration_ms)
    Neon-->>CronAPI: Log Persisted (#reportId)
    CronAPI-->>VC: 200 OK { ok: true, durationMs, reportId }
```

---

## 🗄️ Database Topography & Schema Specifications

```mermaid
erDiagram
    documents ||--o{ document_chunks : "contains (1:N)"
    
    documents {
        serial id PK
        text title "Document Title"
        text source "File origin / URL"
        jsonb metadata "Category, author, tags"
        timestamptz created_at "Timestamp"
    }

    document_chunks {
        serial id PK
        integer document_id FK "References documents(id)"
        text content "Text Chunk (300 words)"
        integer chunk_index "Sequence index"
        vector_1536 embedding "HNSW Cosine Vector(1536)"
        jsonb metadata "Chunk-level tags"
    }

    revops_reports {
        serial id PK
        text trigger "scheduled_revops_sync / manual"
        text status "completed / failed"
        jsonb report "AI workflow result payload"
        integer duration_ms "Execution time in ms"
        timestamptz created_at "Timestamp"
    }
```

---

## 🛣️ API Route Catalog

| Endpoint | Method | Purpose | Auth / Protection |
| :--- | :--- | :--- | :--- |
| `/api/langgraph` | `POST` | Dispatches user queries with Neon RAG context to the LangGraph dev server | None (Public UI) |
| `/api/rag/query` | `POST` | Performs direct `pgvector` HNSW similarity queries | None (Public UI) |
| `/api/rag/ingest` | `POST` | Chunks arbitrary documents, generates vector embeddings, and stores in Neon | None (Internal) |
| `/api/audio` | `GET`, `POST` | Fetches real-time RTL audio tracks & syncs audio transcripts | None (Public/Internal) |
| `/api/cron/revops` | `GET` | Executes automated RevOps AI pipeline every 6h and saves to `revops_reports` | `Bearer CRON_SECRET` |
| `/api/cron/health` | `GET` | Liveness health check for cron scheduler | None |
| `/api/health` | `GET` | Neon database connection diagnostic & table inspection | None |

---

## ⚙️ Tech Stack & Runtime Components

| Layer | Technology | Version / Spec |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.3.3` |
| **Frontend** | React / React DOM | `19.2.4` |
| **Styling** | Tailwind CSS / Oxide Darwin ARM64 | `4.3.3` |
| **Database** | Neon Serverless PostgreSQL | `PostgreSQL 17` |
| **Vector Engine** | `pgvector` HNSW (`cosine_ops`) | `1536 Dimensions` |
| **DB Driver** | `@neondatabase/serverless` | `1.1.0` (HTTP connection pool) |
| **Agent Orchestration** | LangGraph SDK | `@langchain/langgraph-sdk 1.9.28` |
| **AI / GenAI** | `@google/genai` | `2.19.0` |
| **Deployment** | Docker / Vercel Edge & Serverless | Linux / ARM64 multi-stage |

---

## 🚀 Getting Started

### 1. Environment Variables

Create a `.env.local` file in the project root:

```env
DATABASE_URL=postgres://user:password@ep-example-pooler.azure-eastus2.neon.tech/neondb?sslmode=require
LANGGRAPH_API_URL=http://127.0.0.1:2024
LANGGRAPH_API_KEY=optional_key_if_configured
CRON_SECRET=your_vercel_cron_secret
```

### 2. Local Development

```bash
# Install dependencies
npm install

# Run Next.js development server
npm run dev

# Run automated RAG & LangGraph endpoint tests
node scripts/test-rag.mjs
node scripts/test-langgraph-endpoint.mjs
```

### 3. Docker Build & Run

```bash
docker compose up -d
```
