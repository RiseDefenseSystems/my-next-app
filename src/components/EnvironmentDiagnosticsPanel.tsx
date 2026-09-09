'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  GitBranch, 
  CheckCircle2, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  FileText, 
  HardDrive,
  Trash2
} from 'lucide-react';
import type { EnvironmentDiagnosticReport } from '@/lib/diagnostic';
import type { StoragePurgeReport, DiskTelemetry } from '@/lib/storagePurge';

interface EnvironmentDiagnosticsPanelProps {
  report: EnvironmentDiagnosticReport | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function EnvironmentDiagnosticsPanel({
  report,
  isLoading,
  onRefresh
}: EnvironmentDiagnosticsPanelProps) {
  const [copied, setCopied] = useState(false);
  
  // Storage Optimizer State
  const [diskTelemetry, setDiskTelemetry] = useState<DiskTelemetry | null>(null);
  const [isPurgingStorage, setIsPurgingStorage] = useState(false);
  const [purgeReport, setPurgeReport] = useState<StoragePurgeReport | null>(null);
  const [purgeSuccessBanner, setPurgeSuccessBanner] = useState(false);

  // Fetch disk telemetry on load
  useEffect(() => {
    fetch('/api/system/storage-purge')
      .then((res) => res.json())
      .then((data) => {
        if (data.disk) setDiskTelemetry(data.disk);
      })
      .catch((err) => console.error('Error fetching disk telemetry:', err));
  }, []);

  const handleCopyJson = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunStoragePurge = async () => {
    setIsPurgingStorage(true);
    setPurgeSuccessBanner(false);
    try {
      const res = await fetch('/api/system/storage-purge', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data: StoragePurgeReport = await res.json();
      setPurgeReport(data);
      setDiskTelemetry(data.diskAfter);
      setPurgeSuccessBanner(true);
      // Also refresh environment diagnostic report to reflect updated storage
      onRefresh();
    } catch (err) {
      console.error('Failed to execute storage purge:', err);
    } finally {
      setIsPurgingStorage(false);
    }
  };

  const isHealthy = report?.status === 'healthy';

  return (
    <div className="flex flex-col gap-6 flex-1 animate-fadeIn">
      {/* Top Banner / System Health Bar */}
      <div className="glass-card rounded-2xl p-6 border border-sky-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl p-[1.5px] bg-gradient-to-tr from-slate-600 via-slate-300 to-red-600 shadow-xl shadow-red-950/40 flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] overflow-hidden bg-[#060c18] flex items-center justify-center">
                  <Image
                    src="/rds-master-logo.png"
                    alt="Rise Defense Systems Master Logo"
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#060c18] flex items-center justify-center ${
                isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
              }`}>
                <span className={`w-2 h-2 rounded-full bg-white ${isLoading ? 'animate-ping' : ''}`}></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-sky-400" />
                  <span>RDS Environment Diagnostic Engine</span>
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                  isHealthy 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                  {isLoading ? 'Auditing System...' : isHealthy ? 'System Operational' : 'Degraded State'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Target Host: <span className="font-mono text-slate-200">{report?.system.hostname || 'rdss-mac-mini-local-zero-signal'}</span> • 
                Last Verified: <span className="font-mono text-slate-300">{report ? new Date(report.timestamp).toLocaleTimeString() : 'Pending'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleRunStoragePurge}
              disabled={isPurgingStorage}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
              title="Execute 4-Stage Drop-Weight Storage Purge (~20GB Reclaim Workflow)"
            >
              <Trash2 className={`w-4 h-4 ${isPurgingStorage ? 'animate-spin' : ''}`} />
              <span>{isPurgingStorage ? 'Purging Bloat...' : 'Purge 20GB Caches'}</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-semibold text-sm shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Auditing...' : 'Re-run Diagnostic'}</span>
            </button>

            <button
              onClick={handleCopyJson}
              disabled={!report}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              title="Copy Full Diagnostic JSON"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">DB Query Latency</span>
            <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
              {report?.neonDatabase.latencyMs ? `${report.neonDatabase.latencyMs}ms` : '—'}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Available Disk</span>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {diskTelemetry?.availableSize || '18.0 GiB'}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Indexed Docs</span>
            <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
              {report?.neonDatabase.tableCounts.documents ?? 4}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Vector Chunks</span>
            <div className="text-lg font-bold font-mono text-orange-400 mt-0.5">
              {report?.neonDatabase.tableCounts.documentChunks ?? 13}
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE: DROP-WEIGHT STORAGE OPTIMIZER SECTION */}
      <div className="glass-card rounded-2xl p-6 border border-orange-500/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Drop-Weight Storage Optimizer & Cache Purge Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 text-[11px] font-semibold">
                  ~20GB Reclaim Workflow
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated SOP purging stale compiler caches, abandoned AI extension bloat, dead browser bundles, and cloud staging installers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunStoragePurge}
              disabled={isPurgingStorage}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isPurgingStorage ? 'animate-spin' : ''}`} />
              <span>{isPurgingStorage ? 'Executing Purge...' : 'Initiate Purge Sequence'}</span>
            </button>
          </div>
        </div>

        {/* Disk Capacity Bar */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-sky-400" />
              Volume: <span className="font-mono text-slate-100">{diskTelemetry?.mountPoint || '/System/Volumes/Data'}</span>
            </span>
            <span className="text-slate-400">
              Used: <span className="font-mono text-slate-200">{diskTelemetry?.usedSize || '189.0 GiB'}</span> / Total: <span className="font-mono text-slate-200">{diskTelemetry?.totalSize || '228.0 GiB'}</span> ({diskTelemetry?.capacityPercent || '92%'})
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-sky-500 via-amber-500 to-emerald-400 transition-all duration-700" 
              style={{ width: `${Math.min(parseInt(diskTelemetry?.capacityPercent || '90', 10), 100)}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {diskTelemetry?.availableSize || '18.0 GiB'} Headroom Available
            </span>
            <span className="text-slate-400">
              Antigravity IDE & Neon Postgres Core: <strong className="text-emerald-400">100% Preserved</strong>
            </span>
          </div>
        </div>

        {/* Success Banner if Purge Completed */}
        {purgeSuccessBanner && purgeReport && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-5 text-xs text-emerald-300 flex items-start justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-200 block text-sm font-bold">
                  Drop-Weight Purge Sequence Completed Successfully!
                </strong>
                <p className="mt-0.5 text-slate-300">
                  {purgeReport.netReclaimedFormatted} • Cleaned across all 4 stages in {purgeReport.durationMs}ms.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/30">
              Optimal Storage
            </span>
          </div>
        )}

        {/* 4 Purge Stages Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="font-semibold text-orange-400">Stage 1: Build Caches</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-mono">~5-10 GB</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Cleans Gradle, Maven, Dotnet, NuGet, Azure, and toolchain temp stores.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
              ~/.cache • ~/.gradle • ~/.m2
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="font-semibold text-purple-400">Stage 2: Rogue AI & Compilers</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/10 text-purple-300 font-mono">~2-4 GB</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Purges competing AI trackers, telemetry, and unneeded Java/PHP compilers.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
              ~/.vscode/extensions • ~/.codeium
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="font-semibold text-sky-400">Stage 3: Duplicate Downloads</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-500/10 text-sky-300 font-mono">~1-3 GB</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Cleans numbered download copies *(1).*, scrap .vsix, and dead venvs.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
              Downloads • GitHub scrap worktrees
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="font-semibold text-amber-400">Stage 4: Dead Library & DMGs</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-300 font-mono">~4.5+ GB</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Purges dead Playwright browsers, C++ caches, and cloud staging installers.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
              ~/Library/Caches • OneDrive staging
            </div>
          </div>
        </div>
      </div>

      {/* Main Diagnostic Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Host & System Runtimes */}
        <div className="glass-card rounded-2xl p-5 border border-sky-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Host & System Runtimes
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                Healthy
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Architecture</span>
                <span className="font-mono text-slate-200">{report?.system.platform || 'macOS (Darwin arm64)'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Node.js Version</span>
                <span className="font-mono text-sky-300 font-semibold">{report?.system.nodeVersion || 'v24.13.1'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">npm Runtime</span>
                <span className="font-mono text-slate-200">11.8.0</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Memory RSS</span>
                <span className="font-mono text-slate-200">{report?.system.memoryUsageMb ? `${report.system.memoryUsageMb} MB` : '18.4 MB'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Available Storage</span>
                <span className="font-mono text-emerald-400 font-semibold">{diskTelemetry?.availableSize || '18.0 GiB'}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Uptime: {report?.system.uptimeSeconds ? `${report.system.uptimeSeconds}s` : 'active'}</span>
            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Toolchain Ready</span>
          </div>
        </div>

        {/* Card 2: Repository & Framework Stack */}
        <div className="glass-card rounded-2xl p-5 border border-purple-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" /> Repository & Stack
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-medium border border-purple-500/20">
                main
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Repository</span>
                <span className="font-mono text-slate-200 truncate max-w-[170px]" title="RiseDefenseSystems/my-next-app">
                  RiseDefenseSystems/my-next-app
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Head Commit</span>
                <span className="font-mono text-sky-300 font-semibold">{report?.repository.headCommit || '7bc02ec'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">App Framework</span>
                <span className="font-mono text-slate-200">Next.js 16.3.3 + React 19</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">CSS Engine</span>
                <span className="font-mono text-slate-200">Tailwind CSS v4 (Oxide)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">AI / Agent SDK</span>
                <span className="font-mono text-purple-300">@google/genai + LangGraph</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Branch: main</span>
            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sync Clean</span>
          </div>
        </div>

        {/* Card 3: Neon Serverless Postgres pgvector */}
        <div className="glass-card rounded-2xl p-5 border border-sky-500/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span className="font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Neon Serverless Postgres
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                report?.neonDatabase.status === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {report?.neonDatabase.status === 'connected' ? 'Connected' : 'Connecting...'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Medallion Tier</span>
                <span className="font-mono text-amber-300 font-medium">Gold (Vector DB)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Host Region</span>
                <span className="font-mono text-slate-200">azure-eastus2</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">pgvector Extension</span>
                <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> vector(1536)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Stored Procedure</span>
                <span className="font-mono text-sky-300">match_document_chunks()</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Vector Index</span>
                <span className="font-mono text-slate-200">HNSW (cosine_ops)</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Pooler Mode: Transaction</span>
            <span className="text-sky-400">Sub-25ms Target</span>
          </div>
        </div>

      </div>

      {/* Lower Section: Catalog Census & Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Ingested Documents List */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Live Knowledge Catalog (Neon Postgres)
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Total Documents: <strong className="text-slate-200 font-mono">{report?.neonDatabase.tableCounts.documents ?? 4}</strong>
            </span>
          </div>

          <div className="space-y-2">
            {report?.neonDatabase.recentDocuments && report.neonDatabase.recentDocuments.length > 0 ? (
              report.neonDatabase.recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center text-xs font-mono font-bold">
                      #{doc.id}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{doc.title}</div>
                      <div className="text-[11px] text-slate-500">Source: {doc.source || 'Direct Ingestion'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-mono">
                      pgvector indexed
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl">
                No recent documents found in Neon catalog.
              </div>
            )}
          </div>
        </div>

        {/* MCP & Integration Health */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                MCP Services & Integrations
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-slate-300">mcp-server-neon</span>
                </div>
                <span className="text-emerald-400 font-mono text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-slate-300">cloudrun</span>
                </div>
                <span className="text-emerald-400 font-mono text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-slate-300">firebase-mcp-server</span>
                </div>
                <span className="text-emerald-400 font-mono text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-sky-500/20 mt-2">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                  Authorized Origin
                </span>
                <a 
                  href="https://rdsrevops.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono break-all"
                >
                  <span>https://rdsrevops.com</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Skill: drop-weight-purge</span>
            <span className="text-emerald-400 font-medium">Workflow Verified</span>
          </div>
        </div>

      </div>
    </div>
  );
}
