'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { 
  Bot, 
  Send, 
  Database, 
  FileText, 
  CheckCircle2, 
  Zap, 
  Plus, 
  Sparkles, 
  Search, 
  Layers, 
  Server, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  BrainCircuit,
  Sliders,
  ExternalLink,
  ChevronRight,
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  Activity,
  FileAudio,
  UploadCloud,
  FileUp,
  Eye,
  Scissors,
  FileCode,
  Shield,
  X,
  FolderOpen
} from 'lucide-react';
import type { DocumentChunkMatch, DocumentSummary } from '@/lib/rag';
import { RDS_RTL_AUDIO_TRACKS, type AudioTrack } from '@/lib/audio';
import EnvironmentDiagnosticsPanel from '@/components/EnvironmentDiagnosticsPanel';
import type { EnvironmentDiagnosticReport } from '@/lib/diagnostic';

interface ChatMessage {
  id: string;
  sender: 'user' | 'revbot';
  text: string;
  timestamp: string;
  sources?: DocumentChunkMatch[];
}

export default function RevbotUI() {
  const [activeTab, setActiveTab] = useState<'chat' | 'ingest' | 'inspector' | 'audio' | 'diagnostics'>('chat');
  
  // Environment Diagnostics State
  const [diagnosticReport, setDiagnosticReport] = useState<EnvironmentDiagnosticReport | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const runDiagnosticSequence = useCallback(async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/diagnostic/environment', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data: EnvironmentDiagnosticReport = await res.json();
      setDiagnosticReport(data);
    } catch (err) {
      console.error('Failed to run environment diagnostic:', err);
    } finally {
      setIsDiagnosing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const fetchDiag = async () => {
      try {
        const res = await fetch('/api/diagnostic/environment', { method: 'POST' });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data: EnvironmentDiagnosticReport = await res.json();
        if (!ignore) {
          setDiagnosticReport(data);
        }
      } catch (err) {
        console.error('Failed to run environment diagnostic:', err);
      }
    };
    fetchDiag();
    return () => {
      ignore = true;
    };
  }, []);
  
  // RTL Audio Tool State
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack>(RDS_RTL_AUDIO_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isIndexingAudio, setIsIndexingAudio] = useState(false);
  const [audioIndexSuccess, setAudioIndexSuccess] = useState<string | null>(null);
  const [waveTick, setWaveTick] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setWaveTick((prev) => (prev + 1) % 100);
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  // Chat state
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'revbot',
      text: 'Greetings! I am **Revbot**, your AI-powered Revenue Operations assistant powered by **Neon Postgres `pgvector`**. Ask me anything about your revenue workflows, compliance guidelines, or system architecture.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: [
        {
          id: 2,
          document_id: 1,
          content: 'Revbot is an AI-powered revenue operations assistant. It uses Neon Postgres pgvector for high-performance RAG vector search.',
          similarity: 1.0,
          metadata: { section: 'introduction' }
        }
      ]
    }
  ]);
  const [isQuerying, setIsQuerying] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Ingress Studio State
  const [ingestInputMode, setIngestInputMode] = useState<'upload' | 'manual'>('upload');
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestSource, setIngestSource] = useState('');
  const [ingestCategory, setIngestCategory] = useState('Standard Operating Procedures');
  const [ingestSecurityLevel, setIngestSecurityLevel] = useState<'Internal' | 'Confidential' | 'SOC2 Compliant' | 'Executive Only'>('SOC2 Compliant');
  const [ingestDepartment, setIngestDepartment] = useState('RevOps & GTM');
  const [customTags, setCustomTags] = useState<string[]>(['RevOps', 'Postgres', 'pgvector']);
  const [newTagInput, setNewTagInput] = useState('');
  const [ingestContent, setIngestContent] = useState('');
  
  // Real-Time Chunking Sliders
  const [chunkSize, setChunkSize] = useState<number>(250);
  const [chunkOverlap, setChunkOverlap] = useState<number>(40);
  const [previewChunkIndex, setPreviewChunkIndex] = useState<number>(0);

  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number; type: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingestion Execution & Telemetry
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStage, setIngestStage] = useState<'idle' | 'parsing' | 'chunking' | 'embedding' | 'indexing' | 'complete' | 'error'>('idle');
  const [ingestTelemetry, setIngestTelemetry] = useState<{
    success: boolean;
    documentId?: number;
    title?: string;
    chunksCreated?: number;
    totalWords?: number;
    averageWordsPerChunk?: number;
    chunkSize?: number;
    chunkOverlap?: number;
    elapsedMs?: number;
    sampleSnippet?: string;
    error?: string;
  } | null>(null);

  // Ingested Catalog State
  const [catalogDocs, setCatalogDocs] = useState<DocumentSummary[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);

  // Vector Digestion Pipeline Visualizer State
  const [digestionVisualStage, setDigestionVisualStage] = useState<number>(1);
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(false);

  useEffect(() => {
    if (!isAutoSimulating) return;
    const interval = setInterval(() => {
      setDigestionVisualStage((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(interval);
  }, [isAutoSimulating]);

  // Vector Inspector State
  const [inspectorThreshold, setInspectorThreshold] = useState(0.1);
  const [inspectorQueryText, setInspectorQueryText] = useState('RevOps revenue optimization');
  const [isSearchingInspector, setIsSearchingInspector] = useState(false);
  const [inspectorMatches, setInspectorMatches] = useState<DocumentChunkMatch[]>([]);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // LangGraph Thread State
  const [langgraphThreadId, setLanggraphThreadId] = useState<string | null>(null);

  // Execute RAG & LangGraph Query
  const handleSendQuery = useCallback(async (queryText: string = inputQuery) => {
    if (!queryText.trim() || isQuerying) return;

    const userMsgId = crypto.randomUUID();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: queryText,
      timestamp
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsQuerying(true);

    try {
      // 1. First try LangGraph server endpoint (/api/langgraph)
      const lgRes = await fetch('/api/langgraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: queryText,
          threadId: langgraphThreadId
        })
      });

      if (lgRes.ok) {
        const lgData = await lgRes.json();
        if (lgData.threadId) {
          setLanggraphThreadId(lgData.threadId);
        }

        const topMatch = lgData.ragMatches?.[0];
        let botText = `**LangGraph Agent Response** (Thread \`${lgData.threadId?.slice(0, 8)}...\`):\n\n`;

        if (topMatch) {
          botText += `> Context from Neon pgvector: "${topMatch.content}"\n\n`;
        }
        botText += `Retrieval & Graph Execution completed via **LangGraph Studio Dev Server** + **Neon Postgres**.`;

        const botMessage: ChatMessage = {
          id: crypto.randomUUID(),
          sender: 'revbot',
          text: botText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: lgData.ragMatches || []
        };

        setMessages((prev) => [...prev, botMessage]);
        return;
      }

      // 2. Fallback to standard RAG query endpoint (/api/rag/query)
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, topK: 4, threshold: 0.0 })
      });

      const data = await res.json();

      let botText = '';
      if (data.resultsCount > 0) {
        const topMatch = data.matches[0];
        botText = `Based on your indexed RevOps knowledge base in **Neon Postgres**:\n\n> &quot;${topMatch.content}&quot;\n\nRetrieval completed via \`pgvector\` HNSW similarity search with **${(topMatch.similarity * 100).toFixed(1)}% match accuracy**.`;
      } else {
        botText = 'I searched your Neon Postgres `pgvector` index, but did not find high-confidence matches. You can ingest more documents in the **Knowledge Ingestion** tab to expand my memory!';
      }

      const botMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'revbot',
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.matches || []
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'revbot',
          text: '⚠️ Unable to complete RAG vector query. Please ensure Neon Postgres connection is active.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsQuerying(false);
    }
  }, [inputQuery, isQuerying, langgraphThreadId]);

  // Real-Time Chunk Simulator (client-side calculation for live preview)
  const simulatedChunks = useMemo(() => {
    if (!ingestContent || !ingestContent.trim()) return [];
    const words = ingestContent.trim().split(/\s+/);
    const chunks: string[] = [];
    let index = 0;
    while (index < words.length) {
      const chunkWords = words.slice(index, index + chunkSize);
      chunks.push(chunkWords.join(' '));
      index += Math.max(1, chunkSize - chunkOverlap);
    }
    return chunks;
  }, [ingestContent, chunkSize, chunkOverlap]);

  // Document Catalog Fetcher
  const fetchCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await fetch('/api/rag/documents');
      if (res.ok) {
        const data = await res.json();
        setCatalogDocs(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load document catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  // Fetch catalog when activeTab changes to 'ingest'
  useEffect(() => {
    let ignore = false;
    if (activeTab === 'ingest') {
      const loadCatalog = async () => {
        try {
          const res = await fetch('/api/rag/documents');
          if (res.ok) {
            const data = await res.json();
            if (!ignore) {
              setCatalogDocs(data.documents || []);
            }
          }
        } catch (err) {
          console.error('Failed to load document catalog:', err);
        }
      };
      loadCatalog();
    }
    return () => {
      ignore = true;
    };
  }, [activeTab]);

  // Delete document and purge vector embeddings from Neon
  const handleDeleteDocument = async (id: number) => {
    if (!confirm(`Are you sure you want to delete Document #${id} and purge all its vector chunks from Neon Postgres?`)) return;
    setDeletingDocId(id);
    try {
      const res = await fetch(`/api/rag/documents?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCatalogDocs((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeletingDocId(null);
    }
  };

  // Handle Drag and Drop / File Input
  const handleFileDrop = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setIngestTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
      setIngestSource(file.name);
      setIngestContent(text);
      setUploadedFiles([{
        name: file.name,
        size: file.size,
        type: file.type || 'text/plain'
      }]);
    };
    reader.readAsText(file);
  };

  // Sample Templates
  const handleApplyTemplate = (type: 'sop' | 'compliance' | 'pricing') => {
    if (type === 'sop') {
      setIngestTitle('Enterprise RevOps Pipeline & Velocity SOP');
      setIngestSource('pipeline_acceleration_sop.md');
      setIngestCategory('Standard Operating Procedures');
      setIngestSecurityLevel('SOC2 Compliant');
      setIngestDepartment('RevOps & GTM');
      setCustomTags(['RevOps', 'Pipeline', 'DealVelocity', 'SOP']);
      setIngestContent(`Rise Defense Systems Revenue Operations Standard Operating Procedure: Deal Velocity & Pipeline Stage Management.
1. Purpose and Scope:
This SOP governs qualification, stage progression, discounting authority, and automated CRM record synchronization across all Enterprise defense and aerospace accounts.
2. Ingress & Lead Scoring Matrix:
Every inbound target must be evaluated against our firmographic revenue criteria within 15 minutes of initial telemetry receipt. Automated Revbot routing assigns high-intent defense contractors directly to senior RevOps principals.
3. Deal Progression Milestones:
- Stage 1 (Discovery & Security Review): Validate FedRAMP, SOC2 Type II, and CMMC compliance milestones.
- Stage 2 (Technical Validation): Deploy neon_serverless_postgres test bed and verify pgvector ANN similarity latency under 30ms.
- Stage 3 (Procurement & Legal): Mandatory sign-off from Chief Revenue Officer for multi-year license contracts.
4. Retention & Expansion Metrics:
Net Revenue Retention (NRR) target is 135%. Quarterly health checks are triggered automatically via Vercel Cron scheduled pipelines.`);
    } else if (type === 'compliance') {
      setIngestTitle('RevOps Information Security & pgvector Data Isolation Protocol');
      setIngestSource('infosec_vector_isolation.md');
      setIngestCategory('Security & Compliance');
      setIngestSecurityLevel('Confidential');
      setIngestDepartment('Legal & InfoSec');
      setCustomTags(['Security', 'Compliance', 'RBAC', 'SOC2', 'Encryption']);
      setIngestContent(`Rise Defense Systems Information Security & Vector Knowledge Protection Protocol.
1. Data Storage & Encryption Standards:
All customer data and generated vector embeddings stored in Neon PostgreSQL Azure eastus2 instances are encrypted at rest using AES-256 and in transit via TLS 1.3.
2. Vector Index Isolation:
Vector embeddings generated from document chunks are partitioned logically by organization ID and tenant boundary.
3. Access Controls:
Revbot assistant access to high-confidence document chunks is governed by strict JWT role claims. Audit logs are preserved in revops_reports table.`);
    } else {
      setIngestTitle('Q3 Enterprise Licensing & Deal Structuring Matrix');
      setIngestSource('q3_licensing_matrix.csv');
      setIngestCategory('Pricing & Commercials');
      setIngestSecurityLevel('Executive Only');
      setIngestDepartment('Sales Intelligence');
      setCustomTags(['Pricing', 'Licensing', 'Enterprise', 'Discounts']);
      setIngestContent(`Tier,Annual ACV Minimum,Discount Authorization,Approval Role,Deployment Target
Starter Tier,$120000,Up to 10%,RevOps Lead,Multi-tenant Serverless
Growth Tier,$250000,Up to 15%,VP of Sales,Dedicated Neon Compute
Enterprise Defense,$750000,Up to 25%,Chief Revenue Officer,Air-gapped / Isolated VPC
Strategic Sovereign,$1500000,Custom Terms,CEO & Board,On-Premises / Sovereign Cloud`);
    }
  };

  // Add custom tag
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    if (!customTags.includes(cleanTag)) {
      setCustomTags([...customTags, cleanTag]);
    }
    setNewTagInput('');
  };

  // Remove custom tag
  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter((t) => t !== tagToRemove));
  };

  // Execute Ingestion with Pipeline Telemetry
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestTitle || !ingestContent || isIngesting) return;

    setIsIngesting(true);
    setIngestTelemetry(null);
    setIngestStage('parsing');
    setDigestionVisualStage(0);

    try {
      setIngestStage('chunking');
      setDigestionVisualStage(1);
      await new Promise((r) => setTimeout(r, 200));

      setIngestStage('embedding');
      setDigestionVisualStage(2);
      await new Promise((r) => setTimeout(r, 250));

      setIngestStage('indexing');
      setDigestionVisualStage(3);

      const res = await fetch('/api/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ingestTitle,
          source: ingestSource || 'manual_entry.md',
          metadata: {
            category: ingestCategory,
            securityLevel: ingestSecurityLevel,
            department: ingestDepartment,
            tags: customTags,
            timestamp: new Date().toISOString()
          },
          content: ingestContent,
          chunkSize,
          chunkOverlap
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIngestStage('complete');
        setIngestTelemetry({
          success: true,
          documentId: data.documentId,
          title: data.title,
          chunksCreated: data.chunksCreated,
          totalWords: data.totalWords,
          averageWordsPerChunk: data.averageWordsPerChunk,
          chunkSize: data.chunkSize,
          chunkOverlap: data.chunkOverlap,
          elapsedMs: data.elapsedMs,
          sampleSnippet: data.sampleSnippet
        });
        fetchCatalog();
      } else {
        setIngestStage('error');
        setIngestTelemetry({
          success: false,
          error: data.error || 'Ingestion failed.'
        });
      }
    } catch (err: unknown) {
      setIngestStage('error');
      const msg = err instanceof Error ? err.message : 'Network error during ingestion.';
      setIngestTelemetry({ success: false, error: msg });
    } finally {
      setIsIngesting(false);
    }
  };

  // Execute Inspector Search
  const handleInspectorSearch = useCallback(async () => {
    setIsSearchingInspector(true);
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: inspectorQueryText,
          topK: 6,
          threshold: inspectorThreshold
        })
      });
      const data = await res.json();
      setInspectorMatches(data.matches || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingInspector(false);
    }
  }, [inspectorQueryText, inspectorThreshold]);

  useEffect(() => {
    let isSubscribed = true;
    if (activeTab === 'inspector') {
      const runAsyncSearch = async () => {
        try {
          const res = await fetch('/api/rag/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: inspectorQueryText,
              topK: 6,
              threshold: inspectorThreshold
            })
          });
          const data = await res.json();
          if (isSubscribed) {
            setInspectorMatches(data.matches || []);
          }
        } catch (err) {
          console.error(err);
        }
      };
      runAsyncSearch();
    }
    return () => {
      isSubscribed = false;
    };
  }, [activeTab, inspectorThreshold, inspectorQueryText]);

  const handleIndexAudioToNeon = async (track: AudioTrack) => {
    setIsIndexingAudio(true);
    setAudioIndexSuccess(null);
    try {
      const res = await fetch('/api/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: track.title,
          source: track.url,
          metadata: { category: track.category, sentiment: track.sentiment, tags: track.tags },
          content: `[RDS RTL Audio Transcript - ${track.title}]: ${track.transcript}`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAudioIndexSuccess(`Indexed track to Neon Postgres! Created ${data.chunksCreated} vector chunks (Doc #${data.documentId}).`);
      }
    } catch (err) {
      console.error('Error indexing audio to Neon:', err);
    } finally {
      setIsIndexingAudio(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      {/* Top Brand Navigation Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-sky-500/10 px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative group flex-shrink-0">
              <div className="w-11 h-11 rounded-full p-[1.5px] bg-gradient-to-tr from-slate-600 via-slate-300 to-red-600 shadow-lg shadow-red-950/40 flex items-center justify-center">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#060c18] flex items-center justify-center">
                  <Image
                    src="/rds-master-logo.png"
                    alt="Rise Defense Systems Master Logo"
                    width={44}
                    height={44}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    priority
                  />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#060c18]" title="Master Defense System Active"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight gradient-text">Rise Defense Systems</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold">
                  RDS RevOps
                </span>
              </div>
              <p className="text-xs text-slate-400">Revbot RAG Intelligence Platform • Neon Postgres Vector Engine</p>
            </div>
          </div>

          {/* System Status Indicators */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono font-medium">Neon Connected</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Tier: Gold (pgvector)</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-300 font-mono">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>1536-D HNSW</span>
            </div>
            <button 
              onClick={() => {
                setActiveTab('diagnostics');
                runDiagnosticSequence();
              }}
              disabled={isDiagnosing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/15 via-sky-500/15 to-transparent hover:from-emerald-500/25 hover:to-sky-500/25 border border-emerald-500/40 text-emerald-300 transition-all shadow-sm group cursor-pointer"
              title="Initiate Revbot Environment Diagnostic Sequence"
            >
              <Activity className={`w-3.5 h-3.5 text-emerald-400 group-hover:rotate-180 transition-transform ${isDiagnosing ? 'animate-spin' : ''}`} />
              <span className="font-semibold text-slate-100">{isDiagnosing ? 'Auditing...' : 'Check Environment'}</span>
            </button>
            <a 
              href="https://rdsrevops.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 transition-colors group"
              title="Airo App Builder Portal"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 group-hover:animate-ping"></span>
              <span className="font-medium">Airo Builder: rdsrevops.com</span>
              <ExternalLink className="w-3 h-3 text-sky-400/80" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-sky-500/20 to-sky-600/10 text-sky-400 border border-sky-500/40 shadow-lg shadow-sky-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Revbot Copilot</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'audio'
                  ? 'bg-gradient-to-r from-purple-500/20 to-sky-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>RDS RTL Audio Tool</span>
            </button>

            <button
              onClick={() => setActiveTab('ingest')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'ingest'
                  ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-400 border border-orange-500/40 shadow-lg shadow-orange-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>RAG Knowledge Ingestion</span>
            </button>

            <button
              onClick={() => setActiveTab('inspector')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'inspector'
                  ? 'bg-gradient-to-r from-sky-500/20 to-orange-500/20 text-sky-300 border border-sky-500/40 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Neon Vector Inspector</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('diagnostics');
                if (!diagnosticReport) {
                  runDiagnosticSequence();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'diagnostics'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-sky-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Environment Diagnostics</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Server className="w-3.5 h-3.5 text-sky-400" /> Azure eastus2</span>
            <span>•</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Enterprise Secured</span>
          </div>
        </div>

        {/* TAB 1: REVBOT CHAT COPILOT */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            {/* Left Main Chat Thread */}
            <div className="lg:col-span-2 flex flex-col glass-panel rounded-2xl border border-sky-500/15 overflow-hidden h-[680px]">
              
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700/80 p-0.5 shadow-md flex items-center justify-center overflow-hidden">
                      <Image
                        src="/rds-master-logo.png"
                        alt="Revbot Copilot Logo"
                        width={36}
                        height={36}
                        className="rounded-full object-cover"
                      />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#060c18]"></span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                      <span>Revbot Intelligent Assistant</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-mono border border-red-500/30">Master RDS Copilot</span>
                    </h2>
                    <p className="text-xs text-slate-400">Retrieval-Augmented Generation via Neon Postgres</p>
                  </div>
                </div>

                <button 
                  onClick={() => setMessages([messages[0]])}
                  className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 transition-colors"
                >
                  Clear Chat
                </button>
              </div>

              {/* Chat Thread Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-medium text-slate-300">
                        {msg.sender === 'user' ? 'You' : 'Revbot RAG AI'}
                      </span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div 
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-sky-600 to-sky-500 text-white rounded-tr-none shadow-lg shadow-sky-500/10'
                          : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-xl'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {/* Source Citations */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                          <p className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Retrieved Context Sources (Neon pgvector):
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {msg.sources.map((src, i) => (
                              <div 
                                key={i}
                                className="p-2.5 rounded-lg bg-slate-950/80 border border-sky-500/20 text-xs flex flex-col gap-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-slate-400">Document #{src.document_id} • Chunk #{src.id}</span>
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
                                    {(src.similarity * 100).toFixed(1)}% Match
                                  </span>
                                </div>
                                <p className="text-slate-300 italic line-clamp-2">&quot;{src.content}&quot;</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isQuerying && (
                  <div className="flex items-center gap-3 text-slate-400 text-xs py-2">
                    <div className="w-6 h-6 rounded-md bg-sky-500/20 flex items-center justify-center animate-spin">
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <span>Searching Neon Postgres `pgvector` embeddings...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Prompt Suggestions & Input */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col gap-3">
                {/* Prompt Presets */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3 text-orange-400" /> Suggested:
                  </span>
                  {[
                    "What is our RevOps architecture?",
                    "Explain Neon pgvector vector search",
                    "How does Revbot optimize revenue?",
                    "Summarize RDS security standards"
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendQuery(preset)}
                      className="text-xs shrink-0 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-sky-300 transition-all"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Input Controls */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendQuery(); }}
                  className="flex items-center gap-2 bg-slate-900/90 rounded-xl p-1.5 border border-sky-500/20 focus-within:border-sky-500/60 transition-colors"
                >
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask Revbot about revenue operations, documentation, or vector knowledge..."
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuery.trim() || isQuerying}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-medium text-sm flex items-center gap-2 shadow-md shadow-sky-500/20 disabled:opacity-50 transition-all"
                  >
                    <span>Query</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right Panel: Revbot RAG Architecture & System Specs */}
            <div className="flex flex-col gap-6">
              <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                  <Database className="w-4 h-4" />
                  <span>Neon Postgres RAG Spec</span>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400">Database Engine</span>
                    <span className="font-mono text-sky-400">Neon PostgreSQL 17</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400">Vector Extension</span>
                    <span className="font-mono text-emerald-400">pgvector (1536 dims)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400">Index Algorithm</span>
                    <span className="font-mono text-orange-400">HNSW Vector Cosine</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400">Serverless Driver</span>
                    <span className="font-mono text-sky-400">@neondatabase/serverless</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Revbot uses Neon Postgres serverless HTTP connection pooling to query vector embeddings with sub-50ms latency from Next.js server actions.
                  </p>
                </div>
              </div>

              {/* RAG Flow Diagram Card */}
              <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-400" />
                  <span>Revbot Retrieval Pipeline</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-sky-500/20 flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">1</div>
                    <div>
                      <p className="font-medium text-slate-200">User Query Embedding</p>
                      <p className="text-slate-400">Convert query to 1536-dim vector</p>
                    </div>
                  </div>

                  <div className="flex justify-center"><ChevronRight className="w-4 h-4 text-slate-600 rotate-90" /></div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-orange-500/20 flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">2</div>
                    <div>
                      <p className="font-medium text-slate-200">Neon HNSW ANN Search</p>
                      <p className="text-slate-400">SQL stored proc match_document_chunks</p>
                    </div>
                  </div>

                  <div className="flex justify-center"><ChevronRight className="w-4 h-4 text-slate-600 rotate-90" /></div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/20 flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">3</div>
                    <div>
                      <p className="font-medium text-slate-200">Augmented Context Synthesizer</p>
                      <p className="text-slate-400">Stream Revbot response with citations</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REVOPS INGRESS STUDIO */}
        {activeTab === 'ingest' && (
          <div className="flex flex-col gap-6 flex-1">
            
            {/* Top Studio Control Bar & Mode Selector */}
            <div className="glass-panel rounded-2xl p-6 border border-orange-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shadow-lg shadow-orange-500/10">
                  <UploadCloud className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-100">RevOps Ingress Studio</h2>
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono text-[10px] font-semibold uppercase tracking-wider">
                      pgvector Chunk Engine
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Transform documents into semantically windowed 1536-dim vector embeddings in Neon Postgres</p>
                </div>
              </div>

              {/* Mode Switcher & Quick Template Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-900/90 rounded-xl p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIngestInputMode('upload')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      ingestInputMode === 'upload'
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>File Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIngestInputMode('manual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      ingestInputMode === 'manual'
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Direct Editor</span>
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-800">
                  <span className="text-[11px] text-slate-400">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('sop')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-orange-300 border border-slate-800 transition-colors"
                  >
                    Pipeline SOP
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('compliance')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-orange-300 border border-slate-800 transition-colors"
                  >
                    Security Protocol
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('pricing')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-orange-300 border border-slate-800 transition-colors"
                  >
                    Pricing Matrix
                  </button>
                </div>
              </div>
            </div>

            {/* NEURAL VECTOR DIGESTION PIPELINE VISUALIZER */}
            <div className="glass-panel rounded-2xl p-6 border border-sky-500/20 shadow-xl flex flex-col gap-6 relative overflow-hidden">
              {/* Background Ambient Glow */}
              <div className="absolute -right-24 -top-24 w-96 h-96 bg-gradient-to-br from-sky-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-gradient-to-tr from-purple-500/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

              {/* Visualizer Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-orange-500/20 border border-sky-500/40 flex items-center justify-center shadow-lg shadow-sky-500/10">
                    <BrainCircuit className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-100">Neural Vector Digestion Pipeline</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live ML Vector Engine
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Visualizing how unstructured RevOps documentation is digested into a 1536-dimensional HNSW vector database
                    </p>
                  </div>
                </div>

                {/* Pipeline Controls: Auto-Play & Stage Scrubbers */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isAutoSimulating
                        ? 'bg-gradient-to-r from-orange-500 to-sky-500 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {isAutoSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-orange-400" />}
                    <span>{isAutoSimulating ? 'Pause Flow' : 'Auto-Play Digestion'}</span>
                  </button>

                  {/* Stage Jump Buttons */}
                  <div className="flex items-center bg-slate-900/90 rounded-xl p-1 border border-slate-800 text-xs">
                    {[
                      { idx: 0, label: '1. Raw Text' },
                      { idx: 1, label: '2. Sliding Window' },
                      { idx: 2, label: '3. 1536-D Tensors' },
                      { idx: 3, label: '4. HNSW Graph' }
                    ].map((step) => (
                      <button
                        key={step.idx}
                        type="button"
                        onClick={() => {
                          setDigestionVisualStage(step.idx);
                          setIsAutoSimulating(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all ${
                          digestionVisualStage === step.idx
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4-Stage Visual Interactive Flow Canvas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                
                {/* STAGE 1: RAW STREAM */}
                <div
                  onClick={() => { setDigestionVisualStage(0); setIsAutoSimulating(false); }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    digestionVisualStage === 0
                      ? 'bg-slate-900/95 border-sky-500 ring-1 ring-sky-500/50 shadow-lg shadow-sky-500/10 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">Stage 1</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-900/40 text-amber-300 border border-amber-600/30">Bronze</span>
                    </div>
                    <FileText className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">Raw Unstructured Text</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">SOPs, Playbooks & Audio Ingress</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-900 font-mono text-[10px] text-slate-300 space-y-1 overflow-hidden h-20">
                    <div className="text-sky-300/90 truncate">&gt; RDS RevOps Deal Stage 2</div>
                    <div className="text-slate-400 truncate">&gt; CMMC Milestones Passed</div>
                    <div className="text-orange-400/90 truncate">&gt; CAC Payback: 8.2 Months</div>
                    <div className="text-slate-500 truncate">&gt; NRR Target: 135% ARR</div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-900 pt-2">
                    <span>Landing: Bronze Tier</span>
                    <span className="text-sky-400">Continuous</span>
                  </div>
                </div>

                {/* STAGE 2: SLIDING CONTEXT WINDOW */}
                <div
                  onClick={() => { setDigestionVisualStage(1); setIsAutoSimulating(false); }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    digestionVisualStage === 1
                      ? 'bg-slate-900/95 border-orange-500 ring-1 ring-orange-500/50 shadow-lg shadow-orange-500/10 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold">Stage 2</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-700/60 text-slate-200 border border-slate-500/40">Silver</span>
                    </div>
                    <Scissors className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">Sliding Context Window</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Token Slicing & Continuity</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-900 flex flex-col justify-center gap-1.5 h-20">
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 truncate">Chunk [1..{chunkSize}]</span>
                      <span className="text-slate-500">➔</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 font-semibold truncate">
                        Overlap: +{chunkOverlap}w
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-emerald-400 truncate">
                      ✓ No Boundary Hallucinations
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-900 pt-2">
                    <span>Parsed: Silver Tier</span>
                    <span className="text-orange-400">+{chunkOverlap}w Bridge</span>
                  </div>
                </div>

                {/* STAGE 3: 1536-D NEURAL EMBEDDING */}
                <div
                  onClick={() => { setDigestionVisualStage(2); setIsAutoSimulating(false); }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    digestionVisualStage === 2
                      ? 'bg-slate-900/95 border-purple-500 ring-1 ring-purple-500/50 shadow-lg shadow-purple-500/10 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Stage 3</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-900/40 text-purple-300 border border-purple-500/30">Vector</span>
                    </div>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">1536-D Tensor Projection</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Semantic High-D Embedding</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-900 flex flex-col justify-center gap-1.5 h-20 overflow-hidden font-mono text-[10px]">
                    <div className="text-purple-300 truncate">[ +0.1429, -0.8912,</div>
                    <div className="text-sky-300 truncate">  +0.3341, -0.0482,</div>
                    <div className="text-emerald-300 truncate">  ... +0.0215 (1536)]</div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-900 pt-2">
                    <span>Format: Float32</span>
                    <span className="text-purple-400">Normalized</span>
                  </div>
                </div>

                {/* STAGE 4: HNSW PROXIMITY GRAPH */}
                <div
                  onClick={() => { setDigestionVisualStage(3); setIsAutoSimulating(false); }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    digestionVisualStage === 3
                      ? 'bg-slate-900/95 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Stage 4</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">Gold Tier</span>
                    </div>
                    <Database className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">Neon HNSW Index</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Approximate Nearest Neighbor</p>
                  </div>
                  {/* Mini SVG Graph Illustration */}
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-900 flex items-center justify-center h-20 relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 100 50">
                      <line x1="20" y1="25" x2="50" y2="15" stroke="rgba(14,165,233,0.4)" strokeWidth="1" />
                      <line x1="50" y1="15" x2="80" y2="25" stroke="rgba(14,165,233,0.4)" strokeWidth="1" />
                      <line x1="50" y1="15" x2="50" y2="40" stroke="rgba(249,115,22,0.4)" strokeWidth="1" />
                      <line x1="20" y1="25" x2="50" y2="40" stroke="rgba(52,211,153,0.4)" strokeWidth="1" />
                      <line x1="80" y1="25" x2="50" y2="40" stroke="rgba(52,211,153,0.4)" strokeWidth="1" />
                      
                      <circle cx="20" cy="25" r="4" fill="#0ea5e9" />
                      <circle cx="80" cy="25" r="4" fill="#0ea5e9" />
                      <circle cx="50" cy="15" r="5" fill="#f97316" className="animate-pulse" />
                      <circle cx="50" cy="40" r="4" fill="#10b981" />
                    </svg>
                    <span className="absolute bottom-1 right-2 text-[9px] font-mono text-emerald-400">cos(θ) &lt; 0.2</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-slate-900 pt-2">
                    <span>Engine: Neon DB</span>
                    <span className="text-emerald-400">&lt; 25ms Query</span>
                  </div>
                </div>

              </div>

              {/* Dynamic Deep-Dive Stage Telemetry Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    {digestionVisualStage === 0 && <FileText className="w-4 h-4 text-sky-400" />}
                    {digestionVisualStage === 1 && <Scissors className="w-4 h-4 text-orange-400" />}
                    {digestionVisualStage === 2 && <Sparkles className="w-4 h-4 text-purple-400" />}
                    {digestionVisualStage === 3 && <Database className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-200">
                      {digestionVisualStage === 0 && 'Stage 1: Raw Unstructured Context Ingress'}
                      {digestionVisualStage === 1 && `Stage 2: Sliding Context Window Tokenization (${chunkSize}w / ${chunkOverlap}w overlap)`}
                      {digestionVisualStage === 2 && 'Stage 3: 1,536-Dimensional Neural Vector Tensor Projection'}
                      {digestionVisualStage === 3 && 'Stage 4: Neon Postgres HNSW Graph Indexing (Azure eastus2)'}
                    </h5>
                    <p className="text-slate-400 mt-1 leading-relaxed text-[11px]">
                      {digestionVisualStage === 0 && 'RevOps SOPs, sales agreements, and transcripts are sanitized and parsed into UTF-8 token sequences for vector database ingress.'}
                      {digestionVisualStage === 1 && `Text is segmented into overlapping ${chunkSize}-word chunks with a ${chunkOverlap}-word continuity bridge so critical contract terms or compliance rules are never severed across chunk borders.`}
                      {digestionVisualStage === 2 && 'Each text chunk is converted into a 1536-dimensional dense float vector, positioning semantically similar concepts together in high-dimensional hyperspace.'}
                      {digestionVisualStage === 3 && 'Vectors are committed into Neon PostgreSQL document_chunks using the pgvector extension, indexed via HNSW cosine similarity graphs for sub-25ms retrieval when Revbot reasons.'}
                    </p>
                  </div>
                </div>

                {/* Architecture Metric Badges */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap font-mono text-[10px]">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    {digestionVisualStage === 0 ? 'Tier: Bronze (Ingress)' : digestionVisualStage === 1 ? 'Tier: Silver (Tokens)' : 'Tier: Gold (pgvector)'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    M=16 efConstruction=64
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-orange-300">
                    pgvector 1536-D
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    Airo Wire Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Main Studio Grid: Ingress Form + Live Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Upload / Content & Metadata Form (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col gap-5">
                  
                  {/* File Upload Mode: Drag and Drop Dropzone */}
                  {ingestInputMode === 'upload' && (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".md,.txt,.json,.csv"
                        className="hidden"
                        onChange={(e) => handleFileDrop(e.target.files)}
                      />

                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          handleFileDrop(e.dataTransfer.files);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                          isDragging
                            ? 'border-orange-500 bg-orange-500/10 scale-[1.01]'
                            : 'border-slate-800 hover:border-orange-500/50 bg-slate-950/60 hover:bg-slate-900/40'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                          <UploadCloud className="w-6 h-6 animate-bounce" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-200">
                            Drag & drop RevOps documentation or <span className="text-orange-400 underline decoration-orange-400/50">browse files</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Supports Markdown (.md), Plain Text (.txt), JSON (.json), and CSV (.csv) up to 10MB
                          </p>
                        </div>
                      </div>

                      {/* File Card Preview */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-200">{uploadedFiles[0].name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{(uploadedFiles[0].size / 1024).toFixed(1)} KB • Parsed & Ready</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFiles([]);
                              setIngestContent('');
                              setIngestTitle('');
                              setIngestSource('');
                            }}
                            className="text-xs text-slate-400 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Document Identifiers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-orange-400" />
                        <span>Document Title *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ingestTitle}
                        onChange={(e) => setIngestTitle(e.target.value)}
                        placeholder="e.g., Q3 RevOps Pipeline Acceleration Playbook"
                        className="w-full bg-slate-900/90 border border-slate-800 focus:border-orange-500/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-sky-400" />
                        <span>Source Identifier</span>
                      </label>
                      <input
                        type="text"
                        value={ingestSource}
                        onChange={(e) => setIngestSource(e.target.value)}
                        placeholder="e.g., revops_playbook_2026.md"
                        className="w-full bg-slate-900/90 border border-slate-800 focus:border-sky-500/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Direct Editor Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <span>Document Knowledge Content *</span>
                      </label>
                      <div className="text-[11px] font-mono text-slate-400">
                        {ingestContent ? ingestContent.trim().split(/\s+/).length : 0} words • {ingestContent.length} chars
                      </div>
                    </div>
                    <textarea
                      required
                      rows={8}
                      value={ingestContent}
                      onChange={(e) => setIngestContent(e.target.value)}
                      placeholder="Paste or edit RevOps procedures, pipeline guidelines, or security documentation here. The live chunk simulator below will instantaneously compute chunk windows..."
                      className="w-full bg-slate-900/90 border border-slate-800 focus:border-orange-500/60 rounded-xl p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono leading-relaxed transition-colors"
                    />
                  </div>

                  {/* Governance & Metadata Controls */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>Governance & Metadata Tagging</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="block text-[11px] text-slate-400 mb-1">Knowledge Category</span>
                        <select
                          value={ingestCategory}
                          onChange={(e) => setIngestCategory(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                        >
                          <option value="Standard Operating Procedures">Standard Operating Procedures</option>
                          <option value="Sales Playbooks">Sales Playbooks</option>
                          <option value="Pricing & Commercials">Pricing & Commercials</option>
                          <option value="Security & Compliance">Security & Compliance</option>
                          <option value="Customer Success & Retention">Customer Success & Retention</option>
                        </select>
                      </div>

                      <div>
                        <span className="block text-[11px] text-slate-400 mb-1">Department Scope</span>
                        <select
                          value={ingestDepartment}
                          onChange={(e) => setIngestDepartment(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                        >
                          <option value="RevOps & GTM">RevOps & GTM</option>
                          <option value="Sales Intelligence">Sales Intelligence</option>
                          <option value="Customer Success">Customer Success</option>
                          <option value="Legal & InfoSec">Legal & InfoSec</option>
                        </select>
                      </div>
                    </div>

                    {/* Security Level Radio Pills */}
                    <div>
                      <span className="block text-[11px] text-slate-400 mb-1.5">Security Classification</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'Internal', color: 'text-slate-300 border-slate-700 bg-slate-800/50' },
                          { id: 'Confidential', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                          { id: 'SOC2 Compliant', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
                          { id: 'Executive Only', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
                        ].map((sec) => (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => setIngestSecurityLevel(sec.id as typeof ingestSecurityLevel)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-center transition-all ${
                              ingestSecurityLevel === sec.id
                                ? `${sec.color} ring-1 ring-orange-400/50 shadow-sm`
                                : 'text-slate-400 border-slate-800 bg-slate-900/50 hover:bg-slate-900'
                            }`}
                          >
                            {sec.id}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tag Pills */}
                    <div>
                      <span className="block text-[11px] text-slate-400 mb-1.5">Keywords & Tags</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {customTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-sky-300 flex items-center gap-1"
                          >
                            <span>#{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="text-slate-500 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                            placeholder="+ Add Tag"
                            className="w-20 bg-slate-900 border border-slate-800 rounded-full px-2 py-0.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission & Action Button */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-orange-400" />
                      <span>Ready to segment <strong className="text-orange-400 font-mono">{simulatedChunks.length}</strong> vector chunks into Neon HNSW</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleIngest}
                      disabled={isIngesting || !ingestTitle || !ingestContent.trim()}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all"
                    >
                      {isIngesting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Executing Ingress...</span>
                        </>
                      ) : (
                        <>
                          <span>Ingest & Index to Neon Postgres</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Live Stepper Telemetry during ingestion */}
                  {isIngesting && (
                    <div className="p-4 rounded-xl bg-slate-950/90 border border-orange-500/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-orange-300 flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                          Ingestion Pipeline Active: {ingestStage.toUpperCase()}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">Azure eastus2</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-sky-400 h-full transition-all duration-300"
                          style={{
                            width: ingestStage === 'parsing' ? '25%' : ingestStage === 'chunking' ? '50%' : ingestStage === 'embedding' ? '75%' : '95%'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ingestion Telemetry Feedback Alert */}
                  {ingestTelemetry && (
                    <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                      ingestTelemetry.success 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-sm">
                            {ingestTelemetry.success ? 'Document Successfully Indexed in Neon Postgres!' : 'Ingestion Failed'}
                          </span>
                        </div>
                        {ingestTelemetry.elapsedMs && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            {ingestTelemetry.elapsedMs}ms
                          </span>
                        )}
                      </div>

                      {ingestTelemetry.success ? (
                        <div className="flex flex-col gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-emerald-400/90">
                            <span>Document ID: #{ingestTelemetry.documentId}</span>
                            <span>•</span>
                            <span>Created: {ingestTelemetry.chunksCreated} Chunks</span>
                            <span>•</span>
                            <span>Total Words: {ingestTelemetry.totalWords}</span>
                            <span>•</span>
                            <span>Avg Chunks: {ingestTelemetry.averageWordsPerChunk} words</span>
                          </div>

                          {/* Quick Follow-up Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20">
                            <button
                              type="button"
                              onClick={() => {
                                setInputQuery(`Tell me about ${ingestTelemetry.title}`);
                                setActiveTab('chat');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 font-medium text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Bot className="w-3.5 h-3.5 text-sky-400" />
                              <span>Ask Revbot Copilot</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setInspectorQueryText(ingestTelemetry.title || '');
                                setActiveTab('inspector');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-200 font-medium text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Database className="w-3.5 h-3.5 text-orange-400" />
                              <span>Inspect in Vector Inspector</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-red-300">{ingestTelemetry.error}</p>
                      )}
                    </div>
                  )}

                </div>
              </div>

              {/* Right Column: Real-Time Chunk Simulator & Ingested Catalog (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* Real-Time Chunking Simulator Card */}
                <div className="glass-card rounded-2xl p-6 flex flex-col gap-5 border border-orange-500/20">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-orange-400" />
                      <h3 className="font-semibold text-sm text-slate-100">Interactive Chunking Engine</h3>
                    </div>
                    <span className="text-[11px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/30">
                      Live Preview
                    </span>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-300 font-medium">Chunk Size (Words)</span>
                        <span className="font-mono text-orange-400 font-bold">{chunkSize} words</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="800"
                        step="25"
                        value={chunkSize}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setChunkSize(val);
                          if (chunkOverlap >= val) {
                            setChunkOverlap(Math.floor(val / 4));
                          }
                        }}
                        className="w-full accent-orange-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                        <span>100 (Fine)</span>
                        <span>400 (Standard)</span>
                        <span>800 (Broad)</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-300 font-medium">Chunk Overlap (Words)</span>
                        <span className="font-mono text-sky-400 font-bold">{chunkOverlap} words</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max={Math.floor(chunkSize / 2)}
                        step="5"
                        value={chunkOverlap}
                        onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                        <span>10 words</span>
                        <span>{Math.round((chunkOverlap / chunkSize) * 100)}% continuity ratio</span>
                        <span>{Math.floor(chunkSize / 2)} words max</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metrics Pill */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-mono">Chunks</span>
                      <span className="text-base font-bold text-orange-400 font-mono">{simulatedChunks.length}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-mono">Tokens (Est.)</span>
                      <span className="text-base font-bold text-sky-400 font-mono">{Math.round(chunkSize * 1.33)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-mono">Vectors</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">1536 dims</span>
                    </div>
                  </div>

                  {/* Live Visualizer: Simulated Chunk Slices */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-sky-400" />
                        <span>Simulated Chunk Inspector</span>
                      </span>
                      {simulatedChunks.length > 0 && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={previewChunkIndex === 0}
                            onClick={() => setPreviewChunkIndex((prev) => Math.max(0, prev - 1))}
                            className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 text-xs font-mono"
                          >
                            Prev
                          </button>
                          <span className="text-[11px] font-mono text-slate-400 px-1">
                            {previewChunkIndex + 1}/{simulatedChunks.length}
                          </span>
                          <button
                            type="button"
                            disabled={previewChunkIndex >= simulatedChunks.length - 1}
                            onClick={() => setPreviewChunkIndex((prev) => Math.min(simulatedChunks.length - 1, prev + 1))}
                            className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 text-xs font-mono"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>

                    {simulatedChunks.length > 0 ? (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs flex flex-col gap-2">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                          <span className="font-mono text-orange-400 font-semibold">Chunk #{previewChunkIndex + 1}</span>
                          <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900">
                            {simulatedChunks[previewChunkIndex]?.split(/\s+/).length} words
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed font-sans line-clamp-4">
                          &quot;{simulatedChunks[previewChunkIndex]}&quot;
                        </p>
                        {previewChunkIndex > 0 && (
                          <div className="pt-1 border-t border-slate-900 flex items-center gap-1 text-[10px] font-mono text-sky-400">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Preserves {chunkOverlap}-word context window with Chunk #{previewChunkIndex}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                        Enter document content or upload a file to preview live chunking windows.
                      </div>
                    )}
                  </div>
                </div>

                {/* Ingested Document Catalog Card */}
                <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 border border-sky-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-sky-400" />
                      <h3 className="font-semibold text-sm text-slate-100">Indexed Knowledge Catalog</h3>
                    </div>
                    <button
                      type="button"
                      onClick={fetchCatalog}
                      disabled={isLoadingCatalog}
                      className="text-xs text-slate-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {catalogDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-xs flex flex-col gap-1.5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 truncate max-w-[220px]" title={doc.title}>
                            {doc.title}
                          </span>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-semibold">
                            {doc.chunk_count} Chunks
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="truncate max-w-[180px] font-mono text-[10px]">
                            {doc.source || `Doc #${doc.id}`}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectorQueryText(doc.title);
                                setActiveTab('inspector');
                              }}
                              className="text-sky-400 hover:text-sky-300 text-[11px] transition-colors"
                              title="Inspect vectors"
                            >
                              Inspect
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              disabled={deletingDocId === doc.id}
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-red-400 hover:text-red-300 text-[11px] transition-colors disabled:opacity-50"
                              title="Delete from Neon"
                            >
                              {deletingDocId === doc.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {catalogDocs.length === 0 && !isLoadingCatalog && (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No indexed documents found in Neon Postgres. Ingest your first SOP above!
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}


        {/* TAB 3: NEON VECTOR INSPECTOR */}
        {activeTab === 'inspector' && (
          <div className="flex flex-col gap-6 flex-1">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-5 border border-sky-500/20">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>HNSW Vector Index</span>
                  <Database className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 font-mono">Active</div>
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> cosine_ops enabled
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-orange-500/20">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Vector Dimensions</span>
                  <Zap className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 font-mono">1,536 dims</div>
                <p className="text-[11px] text-slate-400 mt-1">Float32 normalized vectors</p>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-sky-500/20">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Connection Driver</span>
                  <Server className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 font-mono">HTTP Pool</div>
                <p className="text-[11px] text-slate-400 mt-1">@neondatabase/serverless</p>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Query Latency</span>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-400 font-mono">~24 ms</div>
                <p className="text-[11px] text-slate-400 mt-1">Zero connection overhead</p>
              </div>
            </div>

            {/* Inspector Query & Threshold Controls */}
            <div className="glass-panel rounded-2xl p-6 border border-sky-500/20 flex flex-col md:flex-row items-center gap-4 justify-between">
              <div className="flex-1 w-full flex items-center gap-2 bg-slate-900/90 rounded-xl p-1.5 border border-slate-800">
                <Search className="w-4 h-4 text-slate-400 ml-3" />
                <input
                  type="text"
                  value={inspectorQueryText}
                  onChange={(e) => setInspectorQueryText(e.target.value)}
                  placeholder="Test similarity search query..."
                  className="flex-1 bg-transparent px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={handleInspectorSearch}
                  disabled={isSearchingInspector}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                >
                  {isSearchingInspector ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Test Search</span>
                </button>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Sliders className="w-4 h-4 text-orange-400" />
                  <span>Min Similarity:</span>
                  <span className="font-mono text-orange-400 font-bold w-10">{(inspectorThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.9"
                  step="0.05"
                  value={inspectorThreshold}
                  onChange={(e) => setInspectorThreshold(parseFloat(e.target.value))}
                  className="w-32 accent-orange-500"
                />
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inspectorMatches.map((match, idx) => (
                <div key={idx} className="glass-card rounded-xl p-5 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-mono text-slate-400">Chunk #{match.id} (Doc #{match.document_id})</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold">
                      Similarity: {(match.similarity * 100).toFixed(1)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    &quot;{match.content}&quot;
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <span>Metadata: <code className="text-sky-300">{JSON.stringify(match.metadata || {})}</code></span>
                    <button 
                      onClick={() => copyToClipboard(match.content, match.id.toString())}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedId === match.id.toString() ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === match.id.toString() ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              ))}

              {inspectorMatches.length === 0 && (
                <div className="col-span-full p-12 text-center text-slate-400 text-sm glass-panel rounded-2xl">
                  No vector chunks matched the threshold of {(inspectorThreshold * 100).toFixed(0)}%. Try lowering the threshold or ingesting new documents.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: RDS RTL AUDIO TOOL */}
        {activeTab === 'audio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            {/* Left Panel: Active Live Audio Player & Waveform Visualizer */}
            <div className="lg:col-span-2 flex flex-col glass-panel rounded-2xl border border-purple-500/20 p-6 gap-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-100">RDS RTL Audio Intelligence Stream</h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Real-Time Audio Analysis & Telemetry for Revenue Operations</p>
                  </div>
                </div>

                <a 
                  href="https://rdsrevops.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium transition-colors self-start sm:self-auto"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>rdsrevops.com Audio Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Player Deck */}
              <div className="glass-card rounded-2xl p-6 border border-purple-500/20 flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono text-purple-400 uppercase tracking-wide">{selectedTrack.category}</span>
                    <h3 className="text-base font-semibold text-slate-100 mt-0.5">{selectedTrack.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      selectedTrack.sentiment === 'positive'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    }`}>
                      {selectedTrack.sentiment === 'positive' ? 'Positive Sentiment' : 'Action Required'}
                    </span>
                  </div>
                </div>

                {/* Animated Waveform Visualizer */}
                <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex items-center justify-between gap-1.5 h-24 overflow-hidden">
                  {[40, 65, 25, 80, 50, 95, 30, 75, 45, 88, 60, 100, 70, 45, 90, 35, 80, 55, 68, 42, 85, 30, 60, 45].map((height, i) => (
                    <div
                      key={i}
                      style={{
                        height: isPlaying ? `${Math.max(15, (height * (0.6 + Math.sin(i + waveTick * 0.4) * 0.4)))}%` : `${height * 0.4}%`,
                        transition: 'height 0.15s ease'
                      }}
                      className={`w-full rounded-full ${
                        isPlaying 
                          ? i % 2 === 0 ? 'bg-gradient-to-t from-purple-500 to-sky-400 shadow-sm shadow-purple-500/50' : 'bg-gradient-to-t from-sky-500 to-emerald-400'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Audio Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-sky-500 hover:from-purple-400 hover:to-sky-400 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 transition-all"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="w-9 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
                    </button>

                    <div className="text-xs font-mono text-slate-400">
                      <span>{isPlaying ? '01:42' : '00:00'}</span> / <span>{selectedTrack.duration}</span>
                    </div>
                  </div>

                  {/* Playback Speed Selectors */}
                  <div className="flex items-center gap-1.5 bg-slate-900/90 rounded-xl p-1 border border-slate-800 self-start sm:self-auto">
                    {[1.0, 1.25, 1.5, 2.0].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                          playbackSpeed === speed
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Transcript & Vector Sync Box */}
              <div className="bg-slate-950/70 rounded-2xl p-5 border border-slate-800/80 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                    <Mic className="w-4 h-4 text-purple-400" />
                    <span>Real-Time Live Transcript</span>
                  </div>

                  <button
                    onClick={() => handleIndexAudioToNeon(selectedTrack)}
                    disabled={isIndexingAudio}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-sky-500/20 hover:from-purple-500/30 hover:to-sky-500/30 border border-purple-500/40 text-purple-200 text-xs font-medium shadow-sm transition-all disabled:opacity-50"
                  >
                    {isIndexingAudio ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5 text-sky-400" />}
                    <span>Index Transcript to Neon pgvector</span>
                  </button>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed italic bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                  &quot;{selectedTrack.transcript}&quot;
                </p>

                {audioIndexSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{audioIndexSuccess}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: RTL Track Library & Audio Intelligence Metrics */}
            <div className="flex flex-col gap-6">
              {/* Track Selector List */}
              <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-purple-400" />
                  <span>RTL Audio Briefing Feeds</span>
                </h3>

                <div className="space-y-2.5">
                  {RDS_RTL_AUDIO_TRACKS.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => {
                        setSelectedTrack(track);
                        setAudioIndexSuccess(null);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedTrack.id === track.id
                          ? 'bg-purple-500/15 border-purple-500/50 shadow-md shadow-purple-500/10'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono text-purple-400 text-[11px]">{track.category}</span>
                        <span className="text-slate-400 font-mono">{track.duration}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 line-clamp-1">{track.title}</p>
                      
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {track.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-400 border border-slate-800">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RTL Audio Intelligence Specs */}
              <div className="glass-card rounded-2xl p-6 flex flex-col gap-3 text-xs">
                <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>RTL Audio Engine Specs</span>
                </h4>

                <div className="space-y-2 text-slate-300">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400">Sample Rate</span>
                    <span className="font-mono text-sky-400">48.0 kHz 24-bit</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400">Latency Protocol</span>
                    <span className="font-mono text-emerald-400">RTL Stream (HLS/WebAudio)</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400">RAG Embedding</span>
                    <span className="font-mono text-purple-400">Neon pgvector 1536</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RDS ENVIRONMENT DIAGNOSTICS */}
        {activeTab === 'diagnostics' && (
          <EnvironmentDiagnosticsPanel 
            report={diagnosticReport} 
            isLoading={isDiagnosing} 
            onRefresh={runDiagnosticSequence} 
          />
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/rds-master-logo.png"
              alt="Rise Defense Systems Master Logo"
              width={22}
              height={22}
              className="rounded-full opacity-90 hover:opacity-100 transition-opacity"
            />
            <span>© {new Date().getFullYear()} Rise Defense Systems (RDS). All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="hover:text-slate-200 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-200 cursor-pointer">RevOps Compliance</span>
            <span>•</span>
            <a href="https://rdsrevops.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
              rdsrevops.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
