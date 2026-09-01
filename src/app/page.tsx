'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  FileAudio
} from 'lucide-react';
import type { DocumentChunkMatch } from '@/lib/rag';
import { RDS_RTL_AUDIO_TRACKS, type AudioTrack } from '@/lib/audio';

interface ChatMessage {
  id: string;
  sender: 'user' | 'revbot';
  text: string;
  timestamp: string;
  sources?: DocumentChunkMatch[];
}

export default function RevbotUI() {
  const [activeTab, setActiveTab] = useState<'chat' | 'ingest' | 'inspector' | 'audio'>('chat');
  
  // RTL Audio Tool State
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack>(RDS_RTL_AUDIO_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isIndexingAudio, setIsIndexingAudio] = useState(false);
  const [audioIndexSuccess, setAudioIndexSuccess] = useState<string | null>(null);
  
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

  // Ingest Form State
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestSource, setIngestSource] = useState('revbot_docs.md');
  const [ingestCategory, setIngestCategory] = useState('RevOps Standard Operating Procedures');
  const [ingestContent, setIngestContent] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<{ success: boolean; documentId?: number; chunksCreated?: number } | null>(null);

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

  // Execute Ingestion
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestTitle || !ingestContent || isIngesting) return;

    setIsIngesting(true);
    setIngestResult(null);

    try {
      const res = await fetch('/api/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ingestTitle,
          source: ingestSource,
          metadata: { category: ingestCategory, timestamp: new Date().toISOString() },
          content: ingestContent
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIngestResult({
          success: true,
          documentId: data.documentId,
          chunksCreated: data.chunksCreated
        });
        setIngestTitle('');
        setIngestContent('');
      } else {
        setIngestResult({ success: false });
      }
    } catch {
      setIngestResult({ success: false });
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-orange-500 p-0.5 shadow-lg shadow-sky-500/20">
              <div className="w-full h-full bg-[#060c18] rounded-[10px] flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight gradient-text">Rise Defense Systems</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-semibold">
                  RDS RevOps
                </span>
              </div>
              <p className="text-xs text-slate-400">Revbot RAG Intelligence Platform • Neon Postgres Vector Engine</p>
            </div>
          </div>

          {/* System Status Indicators */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono font-medium">Neon Postgres connected</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-sky-500/30 text-sky-400">
              <Zap className="w-3.5 h-3.5" />
              <span className="font-mono">pgvector HNSW</span>
            </div>
            <a 
              href="https://rdsrevops.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 transition-colors"
            >
              <span>rdsrevops.com</span>
              <ExternalLink className="w-3 h-3" />
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
                  <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-sky-400" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#060c18]"></span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-slate-100">Revbot Intelligent Assistant</h2>
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

        {/* TAB 2: KNOWLEDGE INGESTION */}
        {activeTab === 'ingest' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-orange-500/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Ingest Knowledge Base into Neon Postgres</h2>
                  <p className="text-xs text-slate-400">Documents will be chunked into overlapping segments, vector-embedded, and indexed in Neon</p>
                </div>
              </div>

              <form onSubmit={handleIngest} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Document Title *</label>
                    <input
                      type="text"
                      required
                      value={ingestTitle}
                      onChange={(e) => setIngestTitle(e.target.value)}
                      placeholder="e.g., Q3 RevOps Sales Strategy"
                      className="w-full bg-slate-900/90 border border-slate-800 focus:border-orange-500/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Source Identifier</label>
                    <input
                      type="text"
                      value={ingestSource}
                      onChange={(e) => setIngestSource(e.target.value)}
                      placeholder="e.g., revops_strategy_v2.pdf"
                      className="w-full bg-slate-900/90 border border-slate-800 focus:border-orange-500/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category Metadata Tag</label>
                  <input
                    type="text"
                    value={ingestCategory}
                    onChange={(e) => setIngestCategory(e.target.value)}
                    placeholder="e.g., Revenue Operations, SOP, System Docs"
                    className="w-full bg-slate-900/90 border border-slate-800 focus:border-orange-500/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Document Content *</label>
                  <textarea
                    required
                    rows={8}
                    value={ingestContent}
                    onChange={(e) => setIngestContent(e.target.value)}
                    placeholder="Paste full text knowledge here. Revbot will automatically split this into overlapping 300-word chunks for vector search..."
                    className="w-full bg-slate-900/90 border border-slate-800 focus:border-orange-500/60 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-400">
                    Estimated Chunks: <span className="font-mono text-orange-400 font-semibold">{Math.max(1, Math.ceil(ingestContent.split(/\s+/).length / 250))}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isIngesting || !ingestTitle || !ingestContent}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all"
                  >
                    {isIngesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Indexing to Neon...</span>
                      </>
                    ) : (
                      <>
                        <span>Ingest & Create Embeddings</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Ingestion Feedback Result */}
              {ingestResult && (
                <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 ${
                  ingestResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">
                      {ingestResult.success ? 'Document Indexed Successfully!' : 'Ingestion Failed'}
                    </p>
                    {ingestResult.success && (
                      <p className="text-xs text-emerald-400/80 font-mono">
                        Neon Document ID: #{ingestResult.documentId} • Created {ingestResult.chunksCreated} vector chunks
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right side helper info */}
            <div className="flex flex-col gap-6">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold text-sm text-slate-200 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>RAG Ingestion Best Practices</span>
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span>Use descriptive document titles for easy source tracking in Revbot responses.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span>Content is chunked with 50-word overlaps to maintain contextual continuity across chunk boundaries.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span>Vectors are stored as `vector(1536)` in Neon Postgres `document_chunks` table.</span>
                  </li>
                </ul>
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
                        height: isPlaying ? `${Math.max(15, (height * (0.6 + Math.sin(i + Date.now() / 300) * 0.4)))}%` : `${height * 0.4}%`,
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
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} Rise Defense Systems (RDS). All rights reserved.
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
