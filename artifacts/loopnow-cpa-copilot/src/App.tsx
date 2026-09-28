import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import {
  getGetDashboardQueryKey,
  getGetReceiptQueryKey,
  getListAgentRunsQueryKey,
  getListReceiptsQueryKey,
  useDecideApproval,
  useGetDashboard,
  useGetReceipt,
  useListAgentRuns,
  useListReceipts,
  useProcessReceipt,
} from '@workspace/api-client-react';
import type { AgentRun, Receipt } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value ?? 0);

const shortDate = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : '—';

const shortTime = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '—';

const statusLabel = (status: string) => status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'gold' | 'green' | 'red' | 'blue'; children: ReactNode }) {
  const tones = {
    neutral: 'border-foreground/10 bg-muted text-muted-foreground',
    gold: 'border-accent/30 bg-accent/20 text-accent-foreground',
    green: 'border-emerald-700/15 bg-emerald-50 text-emerald-800',
    red: 'border-destructive/20 bg-red-50 text-destructive',
    blue: 'border-sky-700/15 bg-sky-50 text-sky-800',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${tones[tone]}`}>{children}</span>;
}

function MetricCard({ label, value, detail, icon: Icon, accent = 'gold' }: {
  label: string; value: string | number; detail: string; icon: typeof Clock3; accent?: 'gold' | 'blue' | 'red' | 'green';
}) {
  const accentStyles = { gold: 'bg-accent/25 text-accent-foreground', blue: 'bg-sky-100 text-sky-800', red: 'bg-red-100 text-destructive', green: 'bg-emerald-100 text-emerald-800' };
  return (
    <div className="animate-rise panel-shadow rounded-xl border border-border/80 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <span className={`grid size-8 place-items-center rounded-lg ${accentStyles[accent]}`}><Icon size={15} strokeWidth={2.2} /></span>
      </div>
      <p data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`} className="mt-3 font-mono text-2xl font-medium tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const navItems = [
    { label: 'Receipt queue', icon: ReceiptText, active: true },
    { label: 'Audit trail', icon: BookOpenCheck },
    { label: 'Reports', icon: BarChart3 },
  ];
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 lg:flex lg:flex-col ${collapsed ? 'w-[76px]' : 'w-[236px]'}`}>
        <div className="flex h-[76px] items-center border-b border-sidebar-border px-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Activity size={19} /></div>
          {!collapsed && <div className="ml-3"><p className="text-[17px] font-extrabold tracking-[-0.04em]">loopnow</p><p className="font-mono text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/55">CPA copilot</p></div>}
        </div>
        <div className={`flex items-center border-b border-sidebar-border py-4 ${collapsed ? 'justify-center px-2' : 'gap-3 px-5'}`}>
          <div className="grid size-8 place-items-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-primary">ML</div>
          {!collapsed && <div className="min-w-0"><p className="truncate text-xs font-bold">Morgan Lee</p><p className="truncate text-[10px] text-sidebar-foreground/50">Northline & Co. · Admin</p></div>}
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {!collapsed && <p className="mb-3 px-3 pt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/40">Workspace</p>}
          {navItems.map(({ label, icon: Icon, active }) => (
            <button type="button" key={label} data-testid={`nav-${label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setNotice(active ? '' : `${label} is coming to this workspace soon.`)} className={`group flex w-full items-center rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition-colors ${active ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'} ${collapsed ? 'justify-center' : 'gap-3'}`}>
              <Icon size={16} /><span className={collapsed ? 'sr-only' : ''}>{label}</span>{!collapsed && active && <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" />}
            </button>
          ))}
          {!collapsed && <p className="mb-3 mt-8 px-3 pt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/40">Manage</p>}
          <button type="button" data-testid="nav-settings" onClick={() => setNotice('Settings is coming to this workspace soon.')} className={`group flex w-full items-center rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-foreground ${collapsed ? 'justify-center' : 'gap-3'}`}><Settings2 size={16} /><span className={collapsed ? 'sr-only' : ''}>Settings</span></button>
        </nav>
        <div className={`border-t border-sidebar-border p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          <button type="button" data-testid="button-help" onClick={() => setNotice('Support is available from your Northline workspace administrator.')} className={`flex items-center rounded-lg px-3 py-2.5 text-xs font-semibold text-sidebar-foreground/55 hover:bg-sidebar-accent ${collapsed ? '' : 'w-full gap-3 text-left'}`}><CircleHelp size={16} /><span className={collapsed ? 'sr-only' : ''}>Help & support</span></button>
        </div>
        <button type="button" aria-label="Toggle sidebar" data-testid="button-toggle-sidebar" onClick={() => setCollapsed((current) => !current)} className="absolute -right-3 top-[72px] grid size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground">{collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}</button>
      </aside>
      <div className={`transition-[padding] duration-300 lg:pl-[236px] ${collapsed ? 'lg:pl-[76px]' : ''}`}>
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-lg border border-border lg:hidden" aria-label="Open navigation" data-testid="button-mobile-menu"><Menu size={18} /></button><div><p className="text-xs font-bold text-foreground sm:text-sm">Receipt processing</p><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">FY2025 · HST Ontario</p></div></div>
          <div className="flex items-center gap-2 sm:gap-4"><span className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-emerald-600" /> System operational</span><button type="button" aria-label="Notifications" data-testid="button-notifications" onClick={() => setNotice('No new notifications.')} className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"><Bell size={16} /></button><button type="button" data-testid="button-user-menu" onClick={() => setNotice('Signed in as Morgan Lee.')} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-left"><span className="grid size-6 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">ML</span><ChevronDown size={13} className="text-muted-foreground" /></button></div>
        </header>
        {notice && <div role="status" data-testid="status-notice" className="fixed right-5 top-[88px] z-40 flex max-w-[320px] items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-xs font-semibold panel-shadow animate-rise"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-700" />{notice}<button type="button" data-testid="button-dismiss-notice" onClick={() => setNotice('')} className="ml-auto text-muted-foreground hover:text-foreground"><X size={14} /></button></div>}
        {mobileOpen && <div className="fixed inset-0 z-50 bg-sidebar p-5 text-sidebar-foreground lg:hidden"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Activity size={19} /></div><div><p className="text-[17px] font-extrabold tracking-[-0.04em]">loopnow</p><p className="font-mono text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/55">CPA copilot</p></div></div><button type="button" aria-label="Close navigation" data-testid="button-close-mobile-menu" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-lg border border-sidebar-border"><X size={18} /></button></div><div className="mt-10 space-y-2">{navItems.map(({ label, icon: Icon, active }) => <button type="button" key={label} data-testid={`mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`} onClick={() => { setMobileOpen(false); if (!active) setNotice(`${label} is coming to this workspace soon.`); }} className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold ${active ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/65'}`}><Icon size={17} />{label}</button>)}</div></div>}
        {children}
      </div>
    </div>
  );
}

function QueueRow({ receipt, selected, onSelect }: { receipt: Receipt; selected: boolean; onSelect: () => void }) {
  const isReview = receipt.status === 'review' || receipt.category === 'Review Required';
  return (
    <button type="button" data-testid={`row-receipt-${receipt.id}`} onClick={onSelect} className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/60 px-4 py-4 text-left transition-colors hover:bg-accent/10 sm:grid-cols-[minmax(0,1fr)_74px_92px] ${selected ? 'bg-accent/15 shadow-[inset_3px_0_0_hsl(var(--accent))]' : ''}`}>
      <div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-xs font-extrabold text-foreground">{receipt.vendor}</span>{isReview && <span className="size-1.5 shrink-0 rounded-full bg-destructive" />}</div><p className="mt-1 truncate text-[11px] text-muted-foreground">{receipt.description || 'No description recorded'}</p><p className="mt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">{receipt.receiptNumber} · {shortDate(receipt.date)}</p></div>
      <span className="hidden self-center font-mono text-xs font-medium text-foreground sm:block">{money(receipt.total)}</span>
      <span className="self-center justify-self-end"><Badge tone={isReview ? 'red' : receipt.status === 'processed' ? 'green' : 'gold'}>{isReview ? 'Review' : statusLabel(receipt.status)}</Badge></span>
    </button>
  );
}

function QueuePanel({ receipts, selectedId, onSelect, isLoading, isError, onRetry }: { receipts: Receipt[]; selectedId: string; onSelect: (id: string) => void; isLoading: boolean; isError: boolean; onRetry: () => void }) {
  const [filter, setFilter] = useState<'all' | 'review' | 'pending'>('all');
  const filtered = useMemo(() => receipts.filter((receipt) => filter === 'all' || (filter === 'review' ? receipt.status === 'review' || receipt.category === 'Review Required' : receipt.status === 'pending')), [filter, receipts]);
  return (
    <section className="panel-shadow overflow-hidden rounded-xl border border-border/80 bg-card">
      <div className="border-b border-border/70 px-4 pb-3 pt-4 sm:px-5">
        <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><ReceiptText size={15} className="text-accent-foreground" /><h2 className="text-sm font-extrabold tracking-[-0.02em]">Receipt queue</h2></div><p className="mt-1 text-xs text-muted-foreground">Work from the oldest unresolved item first.</p></div><button type="button" data-testid="button-filter-queue" onClick={() => setFilter((current) => current === 'all' ? 'review' : current === 'review' ? 'pending' : 'all')} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground hover:bg-muted"><Filter size={12} /> {filter === 'all' ? 'All' : filter}</button></div>
        <div className="mt-4 flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{filtered.length} visible · sorted by receipt date</p><button type="button" data-testid="button-refresh-queue" onClick={onRetry} className="text-muted-foreground hover:text-foreground"><RefreshCw size={14} /></button></div>
      </div>
      {isLoading ? <div className="space-y-4 p-5">{[1, 2, 3, 4].map((item) => <div key={item} className="animate-pulse-soft"><div className="h-3 w-2/5 rounded bg-muted" /><div className="mt-2 h-2 w-4/5 rounded bg-muted" /><div className="mt-2 h-2 w-1/3 rounded bg-muted" /></div>)}</div>
        : isError ? <div className="grid min-h-[250px] place-items-center p-6 text-center"><AlertCircle className="text-destructive" size={22} /><p className="mt-3 text-sm font-bold">Queue unavailable</p><p className="mt-1 text-xs text-muted-foreground">We could not load the latest receipts.</p><button type="button" data-testid="button-retry-queue" onClick={onRetry} className="mt-4 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Try again</button></div>
        : filtered.length === 0 ? <div className="grid min-h-[250px] place-items-center p-6 text-center"><CheckCircle2 size={24} className="text-emerald-700" /><p className="mt-3 text-sm font-bold">Nothing in this view</p><p className="mt-1 text-xs text-muted-foreground">Your queue is clear for the selected filter.</p></div>
        : <div>{filtered.map((receipt) => <QueueRow key={receipt.id} receipt={receipt} selected={receipt.id === selectedId} onSelect={() => onSelect(receipt.id)} />)}</div>}
    </section>
  );
}

function ReceiptSummary({ receipt, run, onProcess, isProcessing }: { receipt?: Receipt; run?: AgentRun; onProcess: (message?: string) => void; isProcessing: boolean }) {
  const [message, setMessage] = useState('');
  if (!receipt) return <section className="panel-shadow grid min-h-[390px] place-items-center rounded-xl border border-dashed border-border bg-card p-8 text-center"><div><Search size={24} className="mx-auto text-muted-foreground" /><p className="mt-3 text-sm font-bold">Select a receipt to inspect</p><p className="mt-1 max-w-[250px] text-xs leading-5 text-muted-foreground">The complete source, tax treatment, and audit context will appear here.</p></div></section>;
  const needsReview = receipt.status === 'review' || Boolean(run?.approval && run.approval.status === 'pending');
  const analysis = run?.analysis;
  const eligibilityPercent = Math.round((analysis?.eligibilityPercentage ?? receipt.eligibilityPercentage ?? 0) * 100);
  return (
    <section className="panel-shadow overflow-hidden rounded-xl border border-border/80 bg-card">
      <div className="border-b border-border/70 bg-[linear-gradient(110deg,hsl(var(--card)),hsl(var(--accent)/.09))] px-5 pb-5 pt-5 sm:px-6"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><Badge tone={needsReview ? 'red' : receipt.status === 'processed' ? 'green' : 'gold'}>{needsReview ? 'Needs review' : statusLabel(receipt.status)}</Badge><span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{receipt.receiptNumber}</span></div><h1 data-testid="text-selected-vendor" className="mt-3 text-xl font-extrabold tracking-[-0.04em]">{receipt.vendor}</h1><p className="mt-1 max-w-xl text-xs text-muted-foreground">{receipt.description || 'No description recorded'} · {shortDate(receipt.date)}</p></div><button type="button" data-testid="button-receipt-more" onClick={() => setMessage('')} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal size={17} /></button></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Total</p><p data-testid="text-selected-total" className="mt-1 font-mono text-lg font-medium">{money(receipt.total)}</p></div><div><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Tax</p><p className="mt-1 font-mono text-lg font-medium">{money(receipt.taxAmount)}</p></div><div><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Tax type</p><p className="mt-1 text-sm font-bold">{receipt.taxType}</p></div><div><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Commercial use</p><p className="mt-1 font-mono text-lg font-medium">{receipt.commercialUsePercentage}%</p></div></div></div>
       <div className="grid gap-0 divide-y divide-border/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0"><div className="p-5 sm:p-6"><div className="flex items-center justify-between"><h3 className="text-xs font-extrabold uppercase tracking-[0.13em]">Source record</h3><FileText size={15} className="text-muted-foreground" /></div><dl className="mt-5 space-y-3">{[['Category', receipt.category], ['GIFI mapping', receipt.gifiCode ? `${receipt.gifiCode} · ${receipt.gifiDescription ?? ''}` : 'Not mapped'], ['GST / HST number', receipt.gstHstNumber ?? 'Not provided'], ['Documentation', receipt.documentationStatus ? statusLabel(receipt.documentationStatus) : 'Not assessed']].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3 text-xs"><dt className="text-muted-foreground">{label}</dt><dd className="max-w-[58%] text-right font-bold text-foreground">{value}</dd></div>)}</dl></div><div className="p-5 sm:p-6"><div className="flex items-center justify-between"><h3 className="text-xs font-extrabold uppercase tracking-[0.13em]">ITC decision</h3><ShieldCheck size={15} className={analysis?.status === 'eligible' || receipt.eligibleItc ? 'text-emerald-700' : 'text-muted-foreground'} /></div><div className="mt-5 rounded-lg border border-border bg-muted/50 p-4"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Eligible ITC</p><p data-testid="text-eligible-itc" className="mt-1 font-mono text-2xl font-medium text-foreground">{money(analysis?.eligibleItc ?? receipt.eligibleItc)}</p></div><span className="font-mono text-xs text-muted-foreground">{eligibilityPercent}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-emerald-700 transition-all duration-500" style={{ width: `${eligibilityPercent}%` }} /></div><p className="mt-3 text-[11px] leading-5 text-muted-foreground">{analysis?.reason ?? receipt.reviewReason ?? 'Process this receipt to generate a defensible eligibility decision.'}</p></div></div></div>
      <div className="border-t border-border/70 bg-background/40 p-5 sm:p-6"><div className="flex items-center gap-2"><Sparkles size={15} className="text-accent-foreground" /><p className="text-xs font-extrabold">Run the copilot review</p></div><p className="mt-1 text-xs leading-5 text-muted-foreground">The deterministic tool loop will validate the source, classify the expense, and map the result to the active rule set.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} data-testid="input-user-message" placeholder="Optional instruction for this receipt" className="h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-xs placeholder:text-muted-foreground/65" /><button type="button" disabled={isProcessing} data-testid="button-process-receipt" onClick={() => onProcess(message.trim() || undefined)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">{isProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />} {isProcessing ? 'Running checks…' : 'Process receipt'}<ArrowRight size={14} /></button></div>{receipt.reviewReason && <div className="mt-3 flex gap-2 rounded-md border border-destructive/15 bg-red-50 px-3 py-2 text-[11px] leading-5 text-destructive"><AlertCircle size={14} className="mt-0.5 shrink-0" />{receipt.reviewReason}</div>}</div>
    </section>
  );
}

function Timeline({ run, isProcessing }: { run?: AgentRun; isProcessing: boolean }) {
  const fallback = [
    ['reading', 'Read source document', 'Extract vendor, date, line items, and tax signals.'],
    ['validating', 'Validate source quality', 'Check documentation completeness and registration details.'],
    ['categorizing', 'Classify expense', 'Compare expense context with the chart of accounts.'],
    ['calculating', 'Calculate ITC', 'Apply commercial-use and Canadian tax treatment.'],
    ['mapping', 'Map to GIFI', 'Resolve the auditable tax reporting code.'],
  ];
  const events = run?.events ?? [];
  return (
    <section className="panel-shadow rounded-xl border border-border/80 bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Activity size={15} className="text-accent-foreground" /><h2 className="text-sm font-extrabold tracking-[-0.02em]">Processing timeline</h2></div><p className="mt-1 text-xs text-muted-foreground">{run ? `Run ${run.id.slice(0, 8)} · ${run.metrics.toolCount} checks` : 'A live view of the copilot tool loop.'}</p></div>{run && <Badge tone={run.status === 'complete' ? 'green' : run.status === 'error' ? 'red' : 'gold'}>{run.status}</Badge>}</div>
      <div className="relative mt-6 space-y-0">{events.length > 0 ? events.map((event, index) => <TimelineEvent key={event.id} label={event.label} detail={event.detail ?? 'Check completed.'} status={event.status} duration={event.durationMs} last={index === events.length - 1} />) : fallback.map(([stage, label, detail], index) => <TimelineEvent key={stage} label={label} detail={detail} status={isProcessing && index === 0 ? 'running' : 'idle'} duration={0} last={index === fallback.length - 1} />)}</div>
      {!run && !isProcessing && <div className="mt-5 flex items-center gap-2 border-t border-border/70 pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"><LockKeyhole size={13} /> Results are written to the audit trail after processing</div>}
      {run?.metrics && <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/70 pt-4 text-center"><div><p className="font-mono text-sm">{run.metrics.toolCount}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Tool calls</p></div><div><p className="font-mono text-sm">{run.metrics.timeToFirstEventMs}ms</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">First signal</p></div><div><p className="font-mono text-sm">{run.metrics.totalLatencyMs}ms</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Total time</p></div></div>}
    </section>
  );
}

function TimelineEvent({ label, detail, status, duration, last }: { label: string; detail: string; status: string; duration: number; last: boolean }) {
  const running = status === 'running';
  const error = status === 'error';
  return <div className="relative flex gap-3 pb-5">{!last && <span className="absolute left-[9px] top-5 h-full w-px bg-border" />}<span className={`relative z-10 mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full border ${running ? 'border-accent bg-accent/25 text-accent-foreground animate-pulse-soft' : error ? 'border-destructive/40 bg-red-50 text-destructive' : status === 'success' ? 'border-emerald-700/30 bg-emerald-50 text-emerald-700' : 'border-border bg-muted text-muted-foreground'}`}>{running ? <LoaderCircle size={11} className="animate-spin" /> : error ? <XCircle size={11} /> : status === 'success' ? <Check size={11} /> : <span className="size-1.5 rounded-full bg-current" />}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className={`text-xs font-bold ${status === 'idle' ? 'text-muted-foreground' : 'text-foreground'}`}>{label}</p><span className="shrink-0 font-mono text-[9px] text-muted-foreground">{duration ? `${duration}ms` : running ? 'running' : 'queued'}</span></div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{detail}</p></div></div>;
}

function ApprovalCard({ run, onDecision, isPending }: { run?: AgentRun; onDecision: (decision: 'approve' | 'reject') => void; isPending: boolean }) {
  const approval = run?.approval;
  if (!approval || approval.status !== 'pending') return null;
  return <section className="panel-shadow rounded-xl border border-accent/40 bg-accent/10 p-5 sm:p-6"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><AlertCircle size={17} /></div><div><p className="text-sm font-extrabold">Human approval required</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{approval.reason}</p></div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={isPending} data-testid="button-reject-approval" onClick={() => onDecision('reject')} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-destructive/25 bg-card px-3 text-xs font-bold text-destructive hover:bg-red-50 disabled:opacity-60"><XCircle size={14} /> Reject</button><button type="button" disabled={isPending} data-testid="button-approve-approval" onClick={() => onDecision('approve')} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-60">{isPending ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve decision</button></div></section>;
}

function AuditRail({ events }: { events?: AgentRun['auditEvents'] }) {
  const [expanded, setExpanded] = useState(false);
  return <section className="panel-shadow rounded-xl border border-border/80 bg-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><FileCheck2 size={15} className="text-accent-foreground" /><h2 className="text-sm font-extrabold">Recent audit activity</h2></div><p className="mt-1 text-xs text-muted-foreground">Immutable events from this receipt</p></div><button type="button" data-testid="button-audit-more" onClick={() => setExpanded((current) => !current)} className="text-muted-foreground hover:text-foreground" aria-label={expanded ? 'Show fewer audit events' : 'Show more audit events'}><MoreHorizontal size={17} /></button></div>{events && events.length > 0 ? <div className="mt-5 space-y-4">{events.slice(0, expanded ? events.length : 4).map((event) => <div key={event.id} className="flex gap-3"><span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${event.status === 'success' ? 'bg-emerald-700' : event.status === 'review' ? 'bg-accent-foreground' : 'bg-destructive'}`} /><div className="min-w-0"><p className="text-xs font-bold">{event.action}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{event.detail ?? 'No additional detail'} · {shortTime(event.timestamp)}</p></div></div>)}</div> : <div className="mt-5 rounded-lg border border-dashed border-border p-4 text-center"><p className="text-xs font-semibold text-muted-foreground">No audit events for this selection yet.</p></div>}</section>;
}

function Dashboard() {
  const queryClient = useQueryClient();
  const dashboard = useGetDashboard();
  const receipts = useListReceipts();
  const runs = useListAgentRuns();
  const [selectedId, setSelectedId] = useState('');
  const [activeRun, setActiveRun] = useState<AgentRun>();
  const selectedFromList = receipts.data?.find((receipt) => receipt.id === selectedId);
  const selectedReceipt = useGetReceipt(selectedId, { query: { enabled: Boolean(selectedId), queryKey: getGetReceiptQueryKey(selectedId) } });
  const processReceipt = useProcessReceipt();
  const decideApproval = useDecideApproval();

  useEffect(() => {
    if (!selectedId && receipts.data?.length) setSelectedId(receipts.data[0].id);
  }, [receipts.data, selectedId]);

  useEffect(() => {
    if (selectedId && runs.data) setActiveRun(runs.data.find((run) => run.receiptId === selectedId));
  }, [runs.data, selectedId]);

  const receipt = selectedReceipt.data ?? selectedFromList;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListAgentRunsQueryKey() });
    if (selectedId) void queryClient.invalidateQueries({ queryKey: getGetReceiptQueryKey(selectedId) });
  };
  const handleProcess = (userMessage?: string) => {
    if (!selectedId) return;
    processReceipt.mutate({ data: { receiptId: selectedId, ...(userMessage ? { userMessage } : {}) } }, {
      onSuccess: (run) => {
        setActiveRun(run);
        queryClient.setQueryData(getListAgentRunsQueryKey(), (previous: AgentRun[] | undefined) => [run, ...(previous ?? []).filter((item) => item.receiptId !== run.receiptId)]);
        queryClient.setQueryData(getGetReceiptQueryKey(selectedId), (previous: Receipt | undefined) => previous ? { ...previous, status: run.status === 'complete' ? 'processed' : run.status === 'review' ? 'review' : 'error', processingStage: run.status === 'complete' ? 'complete' : run.status === 'review' ? 'review' : 'error', eligibleItc: run.analysis.eligibleItc, eligibilityPercentage: run.analysis.eligibilityPercentage, reviewReason: run.analysis.reason } : previous);
        refresh();
      },
    });
  };
  const handleDecision = (decision: 'approve' | 'reject') => {
    if (!activeRun?.approval) return;
    decideApproval.mutate({ approvalId: activeRun.approval.id, data: { decision } }, {
      onSuccess: (approval) => {
        setActiveRun((current) => current ? { ...current, approval } : current);
        queryClient.setQueryData(getGetReceiptQueryKey(activeRun.receiptId), (previous: Receipt | undefined) => previous ? {
          ...previous,
          status: approval.status === 'approved' ? 'processed' : 'review',
          processingStage: approval.status === 'approved' ? 'complete' : 'review',
        } : previous);
        refresh();
      },
    });
  };
  const recentAudit = activeRun?.auditEvents ?? dashboard.data?.recentAuditEvents;

  return <main className="control-room-grid min-h-[calc(100dvh-76px)]"><div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-7 sm:py-8"><div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground"><span className="size-1.5 rounded-full bg-accent-foreground" /> Operations workspace <span className="text-border">/</span> Receipts</div><h1 className="mt-3 text-[clamp(1.7rem,3vw,2.7rem)] font-extrabold leading-none tracking-[-0.055em]">Move from queue to decision.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">A clear, auditable path for every Canadian receipt — with the source context intact at every step.</p></div><div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"><LockKeyhole size={14} className="text-emerald-700" /><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Ruleset</span><span data-testid="text-rule-version" className="font-mono text-xs font-medium">{dashboard.data?.ruleVersion ?? '—'}</span></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Pending review" value={dashboard.data?.pending ?? '—'} detail="Receipts waiting for a run" icon={Clock3} accent="gold" /><MetricCard label="Processed" value={dashboard.data?.processed ?? '—'} detail="Decisions recorded this period" icon={CheckCircle2} accent="green" /><MetricCard label="Needs attention" value={dashboard.data?.review ?? '—'} detail="Held for accountant review" icon={AlertCircle} accent="red" /><MetricCard label="Eligible ITC" value={dashboard.data ? money(dashboard.data.totalEligibleItc) : '—'} detail="Current queue estimate" icon={ShieldCheck} accent="blue" /></div>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(320px,0.86fr)_minmax(520px,1.55fr)_minmax(280px,0.72fr)]"><QueuePanel receipts={receipts.data ?? []} selectedId={selectedId} onSelect={setSelectedId} isLoading={receipts.isLoading} isError={receipts.isError} onRetry={refresh} /><div className="space-y-6"><ReceiptSummary receipt={receipt} run={activeRun} onProcess={handleProcess} isProcessing={processReceipt.isPending} /><ApprovalCard run={activeRun} onDecision={handleDecision} isPending={decideApproval.isPending} /></div><div className="space-y-6"><Timeline run={activeRun} isProcessing={processReceipt.isPending} /><AuditRail events={recentAudit} /></div></div>
    {processReceipt.isError && <div role="alert" data-testid="status-processing-error" className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-red-50 px-4 py-3 text-xs font-semibold text-destructive"><AlertCircle size={15} /> The copilot run was interrupted. Check the receipt details and try again.</div>}
    <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-border/70 pt-4 text-[10px] text-muted-foreground sm:flex-row"><span>Loopnow CPA Copilot · Canada</span><span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Decisions are versioned and auditable</span></footer>
  </div></main>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Dashboard} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Shell><Router /></Shell></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;