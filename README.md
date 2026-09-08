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
# Neon Postgres Database Connection URLs - Medallion Multi-Tier Architecture
DATABASE_URL=postgresql://user:password@ep-yellow-fog-a8xjbhox-pooler.eastus2.azure.neon.tech/neondb?sslmode=require
NEON_DB_GOLD_URL=postgresql://user:password@ep-yellow-fog-a8xjbhox-pooler.eastus2.azure.neon.tech/neondb?sslmode=require
NEON_DB_SILVER_URL=postgresql://user:password@ep-sample-silver-pooler.eastus2.azure.neon.tech/neondb?sslmode=require
NEON_DB_BRONZE_URL=postgresql://user:password@ep-sample-bronze-pooler.eastus2.azure.neon.tech/neondb?sslmode=require
AIRO_BUILDER_ORIGIN=https://rdsrevops.com

# LangGraph & Cron Automation
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
node scripts/test-catalog.mjs
```

### 3. Docker Build & Run

```bash
docker compose up -d
```

---

## 🤖 Agent Setup & Configuration Guide (Neon, LangGraph & RevOps MCP)

This section provides standardized instructions for AI Agents (Antigravity, Cursor, Claude Code, Windsurf) to bootstrap, verify, and orchestrate the **Neon Postgres Medallion Database**, **LangGraph Dev Server**, and **RevOps MCP Server**.

### 1. Neon Serverless Postgres Setup

The platform uses a **Medallion Architecture (Gold / Silver / Bronze)** powered by Neon Postgres 17 with `pgvector` for high-dimensional vector search.

#### A. Database Schema Bootstrap DDL

Agents should ensure the following DDL is executed on the target Neon database:

```sql
-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Master Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    source TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Document Vector Chunks with 1536-D HNSW Index
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx 
ON document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. RevOps Execution Reports Table
CREATE TABLE IF NOT EXISTS revops_reports (
    id SERIAL PRIMARY KEY,
    trigger TEXT NOT NULL,
    status TEXT NOT NULL,
    report JSONB NOT NULL,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Stored Procedure for Cosine ANN Vector Search
CREATE OR REPLACE FUNCTION match_document_chunks (
    query_embedding VECTOR(1536),
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE (
    id INT,
    document_id INT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        document_chunks.id,
        document_chunks.document_id,
        document_chunks.content,
        document_chunks.metadata,
        1 - (document_chunks.embedding <=> query_embedding) AS similarity
    FROM document_chunks
    WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY document_chunks.embedding <=> query_embedding
    LIMIT match_count;
$$;
```

---

### 2. LangGraph Dev Server Setup

The `/api/langgraph` endpoint connects to a local or remote LangGraph execution runtime.

#### A. Install LangGraph CLI

```bash
pip install -U "langgraph-cli[inmem]"
```

#### B. Run LangGraph Dev Server

Start the LangGraph runner on port `2024`:

```bash
langgraph dev --port 2024 --host 127.0.0.1
```

Verify the server is running:

```bash
curl http://127.0.0.1:2024/ok
```

#### C. Validate LangGraph Endpoint Integration

Run the bundled integration test script to verify Neon RAG retrieval and LangGraph dispatch:

```bash
node scripts/test-langgraph-endpoint.mjs
```

---

### 3. RevOps & Neon MCP Server Configuration

To grant AI Agents direct tool access to Neon Postgres and RevOps operations, configure the following in your IDE's `mcp_config.json` (e.g. `~/.gemini/config/mcp_config.json` or `.agents/mcp_config.json`):

```json
{
  "mcpServers": {
    "mcp-server-neon": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.neon.tech/mcp"
      ],
      "env": {}
    },
    "revops-postgres-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://user:password@ep-yellow-fog-a8xjbhox-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"
      ],
      "env": {}
    }
  }
}
```

#### Available Agent MCP Tools

- **`mcp-server-neon`**:
  - `run_sql` / `run_sql_transaction`: Run arbitrary queries and DDL migrations.
  - `describe_table_schema`: Inspect database structures and constraints.
  - `create_branch` / `reset_from_parent`: Manage database branches for isolated agent scratchpads.
- **`revops-postgres-mcp`**:
  - `query`: Execute direct vector queries and audit log queries against `documents`, `document_chunks`, and `revops_reports`.
  - `schema`: Inspect table definitions and column types in real-time.

---

### 4. Verification Checklist for Agents

Before concluding any architectural or code change, run:

```bash
# 1. Verify ESLint compliance
npm run lint

# 2. Verify Next.js build and route compilation
npm run build

# 3. Test RAG vector ingestion & HNSW cosine similarity search
node scripts/test-rag.mjs

# 4. Test LangGraph endpoint mock & thread dispatch
node scripts/test-langgraph-endpoint.mjs

# 5. Check multi-tier database health diagnostic
curl http://localhost:3000/api/health
```
