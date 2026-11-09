 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Database,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  X,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Provider = "AZURE" | "AWS" | "GCP";
type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
type FindingStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
type DiscoverySource = "SIMULATED" | "LIVE";

type CloudAccount = {
  id: string;
  name: string;
  provider: Provider;
  accountId: string;
  isActive: boolean;
};

type CloudResource = {
  id: string;
  cloudAccountId: string;
  providerResourceId: string;
  name: string;
  resourceType: string;
  provider: Provider;
  region: string | null;
  metadata: Record<string, unknown>;
  discoverySource: DiscoverySource;
  cloudAccount?: {
    id: string;
    name: string;
    provider: Provider;
    accountId: string;
    environment?: string;
  };
};

type SecurityFinding = {
  id: string;
  cloudResourceId: string;
  ruleId: string;
  title: string;
  description: string;
  severity: Severity;
  status: FindingStatus;
  evidence: Record<string, unknown>;
  remediation: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  cloudResource: CloudResource;
  acknowledgedAt: string | null;
  resolutionNote: string | null;
};
type FindingEvent = {
  id: string;
  findingId: string;
  eventType: string;
  fromStatus: FindingStatus | null;
  toStatus: FindingStatus | null;
  note: string | null;
  actorType: "USER" | "SYSTEM";
  actorId: string | null;
  createdAt: string;
};

type FindingHistory = {
  id: string;
  title: string;
  history: FindingEvent[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const severityConfig: Record<Severity, { label: string; className: string; icon: typeof Siren }> = {
  CRITICAL: {
    label: "Critical",
    className: "border-rose-500/25 bg-rose-500/10 text-rose-400",
    icon: Siren,
  },
  HIGH: {
    label: "High",
    className: "border-orange-500/25 bg-orange-500/10 text-orange-400",
    icon: ShieldAlert,
  },
  MEDIUM: {
    label: "Medium",
    className: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    icon: AlertCircle,
  },
  LOW: {
    label: "Low",
    className: "border-sky-500/25 bg-sky-500/10 text-sky-400",
    icon: CircleDot,
  },
  INFORMATIONAL: {
    label: "Informational",
    className: "border-slate-500/25 bg-slate-500/10 text-slate-400",
    icon: Bell,
  },
};

const statusConfig: Record<FindingStatus, string> = {
  OPEN: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  ACKNOWLEDGED: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  RESOLVED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
};

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function providerLabel(provider?: Provider) {
  if (provider === "AZURE") return "Azure";
  if (provider === "AWS") return "AWS";
  if (provider === "GCP") return "Google Cloud";
  return provider || "Unknown";
}

function providerClass(provider?: Provider) {
  if (provider === "AZURE") return "bg-sky-400/10 text-sky-300";
  if (provider === "AWS") return "bg-orange-400/10 text-orange-300";
  if (provider === "GCP") return "bg-blue-400/10 text-blue-300";
  return "bg-muted text-muted-foreground";
}

function getDiscoverySource(finding: SecurityFinding): DiscoverySource {
  const source = finding.cloudResource?.discoverySource;
  return source === "LIVE" ? "LIVE" : "SIMULATED";
}

export default function SecurityFindingsPage() {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [resourceType, setResourceType] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [history, setHistory] = useState<FindingHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`${API_URL}/api/cloud-accounts`, { signal });
    if (!response.ok) throw new Error("Unable to load cloud accounts.");
    const data = await response.json();
    setAccounts(data.accounts ?? data ?? []);
  }, []);

  const loadFindings = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });

    if (search.trim()) params.set("search", search.trim());
    if (severity !== "all") params.set("severity", severity);
    if (status !== "all") params.set("status", status);
    if (provider !== "all") params.set("provider", provider);
    if (resourceType !== "all") params.set("resourceType", resourceType);
    if (accountId !== "all") params.set("cloudAccountId", accountId);

    const response = await fetch(`${API_URL}/api/security/findings?${params.toString()}`, {
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      let message = "Unable to retrieve security findings.";
      try {
        const body = await response.json();
        message = body.message || message;
      } catch {
        // Keep the safe fallback message when the response is not JSON.
      }
      throw new Error(message);
    }

    const data = await response.json();
    const nextFindings: SecurityFinding[] = data.findings ?? [];
    setFindings(nextFindings);
    setPagination((current) => ({
      ...current,
      ...(data.pagination ?? {}),
    }));
    setSelectedFinding((current) => {
      if (!current) return current;
      return nextFindings.find((item) => item.id === current.id) ?? null;
    });
  }, [accountId, pagination.limit, pagination.page, provider, resourceType, search, severity, status]);

  const loadPage = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      await Promise.all([loadAccounts(signal), loadFindings(signal)]);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong while loading findings.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [loadAccounts, loadFindings]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void loadPage(controller.signal);
    return () => controller.abort();
  }, [loadPage]);

  useEffect(() => {
  if (!selectedFinding) {
    setHistory(null);
    return;
  }

  void loadFindingHistory(selectedFinding.id);
}, [selectedFinding?.id]);

  const counts = useMemo(() => {
    const result = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFORMATIONAL: 0,
      OPEN: 0,
      ACKNOWLEDGED: 0,
      RESOLVED: 0,
      SIMULATED: 0,
      LIVE: 0,
    };
    for (const finding of findings) {
      result[finding.severity] += 1;
      result[finding.status] += 1;
      result[getDiscoverySource(finding)] += 1;
    }
    return result;
  }, [findings]);

  const resourceTypes = useMemo(
    () => Array.from(new Set(findings.map((item) => item.cloudResource?.resourceType).filter(Boolean))).sort(),
    [findings],
  );

  const activeFilters = [
    search.trim(),
    severity !== "all" ? severity : "",
    status !== "all" ? status : "",
    provider !== "all" ? provider : "",
    resourceType !== "all" ? resourceType : "",
    accountId !== "all" ? accountId : "",
  ].filter(Boolean).length;

  function resetFilters() {
    setSearch("");
    setSeverity("all");
    setStatus("all");
    setProvider("all");
    setResourceType("all");
    setAccountId("all");
    setPagination((current) => ({ ...current, page: 1 }));
  }

  async function refreshFindings() {
    setRefreshing(true);
    setError("");
    setSuccess("");
    try {
      await Promise.all([loadAccounts(), loadFindings()]);
      setSuccess("Security findings refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function runScan() {
    if (accountId === "all") {
      setError("Select a cloud account before starting a security scan.");
      return;
    }

    setScanning(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/security/scan/${accountId}`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Security scan failed.");

      await loadFindings();
      setSuccess(
        `Scan completed for ${data.accountName || "the selected account"}. ` +
          `${data.resourcesScanned ?? 0} resources scanned; ` +
          `${data.findingsCreated ?? 0} findings created and ` +
          `${data.findingsUpdated ?? 0} updated.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Security scan failed.");
    } finally {
      setScanning(false);
    }
  }
    async function loadFindingHistory(findingId: string) {
  setHistoryLoading(true);

  try {
    const response = await fetch(
      `${API_URL}/api/security/findings/${findingId}/history`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load finding history.");
    }

    setHistory(data);
  } catch (err) {
    setHistory(null);
    setError(
      err instanceof Error ? err.message : "Unable to load finding history."
    );
  } finally {
    setHistoryLoading(false);
  }
}

async function acknowledgeFinding(findingId: string) {
  setActionLoading(true);
  setError("");
  setSuccess("");

  try {
    const response = await fetch(
      `${API_URL}/api/security/findings/${findingId}/acknowledge`,
      { method: "PATCH" }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to acknowledge finding.");
    }

    await loadFindings();
    await loadFindingHistory(findingId);

    setSuccess("Security finding acknowledged successfully.");
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unable to acknowledge finding."
    );
  } finally {
    setActionLoading(false);
  }
}

async function resolveFinding(
  findingId: string,
  resolutionNote: string
) {
  setActionLoading(true);
  setError("");
  setSuccess("");

  try {
    const response = await fetch(
      `${API_URL}/api/security/findings/${findingId}/resolve`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resolutionNote }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to resolve finding.");
    }

    await loadFindings();
    await loadFindingHistory(findingId);

    setSuccess("Security finding resolved successfully.");
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unable to resolve finding."
    );
  } finally {
    setActionLoading(false);
  }
}
  return (
    <AppShell
      title="Security Findings"
      description="Prioritize, investigate, and track cloud security risks across your environments."
    >
      <div className="space-y-7">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Security Intelligence
              <span>/</span>
              Security Findings
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">Security Findings</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Development data
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Investigate detected misconfigurations, understand their evidence, and prioritize remediation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshFindings}
              disabled={refreshing || loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={runScan}
              disabled={scanning || loading || accountId === "all"}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              title={accountId === "all" ? "Choose a cloud account in the filters to run a scan" : "Scan the selected cloud account"}
            >
              <Zap className="h-4 w-4" />
              {scanning ? "Scanning..." : "Run security scan"}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Detection engine status</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Findings currently come from simulated Azure resource inventory used for development and testing.
              Live cloud scanning is not connected yet. No cloud resources are changed by running a scan.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} className="rounded p-0.5 hover:bg-red-500/10" aria-label="Dismiss error">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{success}</span>
            <button onClick={() => setSuccess("")} className="rounded p-0.5 hover:bg-emerald-500/10" aria-label="Dismiss success message">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SeverityCard label="Critical" value={counts.CRITICAL} severity="CRITICAL" description="Immediate attention" />
          <SeverityCard label="High" value={counts.HIGH} severity="HIGH" description="High-priority risk" />
          <SeverityCard label="Medium" value={counts.MEDIUM} severity="MEDIUM" description="Needs review" />
          <SeverityCard label="Low" value={counts.LOW} severity="LOW" description="Lower-priority risk" />
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total findings</p>
              <div className="rounded-lg bg-muted p-2"><Boxes className="h-4 w-4 text-muted-foreground" /></div>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{pagination.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">Matching current filters</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Finding status</p>
                <p className="mt-1 text-xs text-muted-foreground">Status distribution on this page</p>
              </div>
              <CircleDot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatusMetric label="Open" value={counts.OPEN} className="text-rose-400" />
              <StatusMetric label="Acknowledged" value={counts.ACKNOWLEDGED} className="text-amber-400" />
              <StatusMetric label="Resolved" value={counts.RESOLVED} className="text-emerald-400" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Finding provenance</p>
                <p className="mt-1 text-xs text-muted-foreground">Origin of the displayed findings</p>
              </div>
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-5 flex items-center gap-5">
              <div>
                <p className="text-2xl font-semibold tabular-nums">{counts.SIMULATED}</p>
                <p className="mt-1 text-xs text-amber-400">Simulated</p>
              </div>
              <div className="h-9 w-px bg-border" />
              <div>
                <p className="text-2xl font-semibold tabular-nums">{counts.LIVE}</p>
                <p className="mt-1 text-xs text-emerald-400">Live</p>
              </div>
              <p className="ml-auto max-w-[150px] text-right text-[11px] leading-5 text-muted-foreground">
                Counts reflect the current result page, not all matching records.
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Findings explorer</h2>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{pagination.total} results</span>
              </div>
              {activeFilters > 0 && (
                <button onClick={resetFilters} className="text-xs font-medium text-primary hover:underline">
                  Clear filters ({activeFilters})
                </button>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
              <div className="relative min-w-0 sm:col-span-2 xl:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPagination((current) => ({ ...current, page: 1 }));
                  }}
                  placeholder="Search findings, resources, or rules..."
                  aria-label="Search findings"
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary"
                />
              </div>

              <SelectFilter label="Severity" value={severity} onChange={(value) => { setSeverity(value); setPagination((current) => ({ ...current, page: 1 })); }}>
                <option value="all">All severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="INFORMATIONAL">Informational</option>
              </SelectFilter>

              <SelectFilter label="Status" value={status} onChange={(value) => { setStatus(value); setPagination((current) => ({ ...current, page: 1 })); }}>
                <option value="all">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
              </SelectFilter>

              <SelectFilter label="Provider" value={provider} onChange={(value) => { setProvider(value); setPagination((current) => ({ ...current, page: 1 })); }}>
                <option value="all">All providers</option>
                <option value="AZURE">Azure</option>
                <option value="AWS">AWS</option>
                <option value="GCP">Google Cloud</option>
              </SelectFilter>

              <SelectFilter label="Resource type" value={resourceType} onChange={(value) => { setResourceType(value); setPagination((current) => ({ ...current, page: 1 })); }}>
                <option value="all">All resource types</option>
                {resourceTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
              </SelectFilter>

              <SelectFilter label="Cloud account" value={accountId} onChange={(value) => { setAccountId(value); setPagination((current) => ({ ...current, page: 1 })); }}>
                <option value="all">All accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </SelectFilter>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 font-medium">Finding</th>
                  <th className="px-5 py-4 font-medium">Severity</th>
                  <th className="px-5 py-4 font-medium">Resource</th>
                  <th className="px-5 py-4 font-medium">Provider</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Last detected</th>
                  <th className="px-5 py-4 text-right font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />
                    Loading security findings...
                  </td></tr>
                ) : findings.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center">
                    <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                    <p className="font-medium">No findings match your filters</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try adjusting the filters or run a scan for an active cloud account.</p>
                    {activeFilters > 0 && <button onClick={resetFilters} className="mt-3 text-xs font-medium text-primary hover:underline">Clear all filters</button>}
                  </td></tr>
                ) : (
                  findings.map((finding) => (
                    <tr key={finding.id} className={`transition hover:bg-muted/30 ${selectedFinding?.id === finding.id ? "bg-primary/[0.04]" : ""}`}>
                      <td className="max-w-[320px] px-5 py-4">
                        <button onClick={() => setSelectedFinding(finding)} className="text-left">
                          <p className="font-medium text-foreground transition hover:text-primary">{finding.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{finding.ruleId}</p>
                        </button>
                      </td>
                      <td className="px-5 py-4"><SeverityBadge severity={finding.severity} /></td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{finding.cloudResource?.name || "Unknown resource"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{finding.cloudResource?.resourceType?.replaceAll("_", " ") || "—"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${providerClass(finding.cloudResource?.provider)}`}>
                          {providerLabel(finding.cloudResource?.provider)}
                        </span>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={finding.status} /></td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(finding.lastDetectedAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => setSelectedFinding(finding)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground">
                          Investigate <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {pagination.total === 0 ? "No findings to display" : `Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} findings`}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs transition hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="min-w-[90px] text-center text-xs text-muted-foreground">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages || loading || pagination.totalPages === 0}
                onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs transition hover:bg-accent disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {selectedFinding && (
          <FindingDetails
            finding={selectedFinding}
            onClose={() => setSelectedFinding(null)}
             history={history}
             historyLoading={historyLoading}
             actionLoading={actionLoading}
             onAcknowledge={acknowledgeFinding}
             onResolve={resolveFinding}
            />
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          Security findings are detection results, not proof of exploitation. Validate evidence and impact before taking remediation action.
        </p>
      </div>
    </AppShell>
  );
}

function SeverityCard({
  label,
  value,
  severity,
  description,
}: {
  label: string;
  value: number;
  severity: Severity;
  description: string;
}) {
  const config = severityConfig[severity];
  const Icon = config.icon;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label} findings</p>
        <div className={`rounded-lg border p-2 ${config.className}`}><Icon className="h-4 w-4" /></div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const config = severityConfig[severity];
  return <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${config.className}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />{config.label}
  </span>;
}

function StatusBadge({ status }: { status: FindingStatus }) {
  return <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${statusConfig[status]}`}>
    {status.charAt(0) + status.slice(1).toLowerCase()}
  </span>;
}

function StatusMetric({ label, value, className }: { label: string; value: number; className: string }) {
  return <div className="rounded-lg bg-muted/40 p-3">
    <p className={`text-2xl font-semibold tabular-nums ${className}`}>{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
  </div>;
}

function SelectFilter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return <select
    aria-label={label}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-xs outline-none transition focus:border-primary"
  >
    {children}
  </select>;
}

function FindingDetails({
  finding,
  onClose,
  history,
  historyLoading,
  actionLoading,
  onAcknowledge,
  onResolve,
}: {
  finding: SecurityFinding;
  onClose: () => void;
  history: FindingHistory | null;
  historyLoading: boolean;
  actionLoading: boolean;
  onAcknowledge: (findingId: string) => Promise<void>;
  onResolve: (findingId: string, resolutionNote: string) => Promise<void>;
}) {
  const [resolutionNote, setResolutionNote] = useState("");
  const [showResolutionForm, setShowResolutionForm] = useState(false);

  const resource = finding.cloudResource;
  const source = getDiscoverySource(finding);

  const canResolve = finding.status === "OPEN" || finding.status === "ACKNOWLEDGED";

  const eventLabels: Record<string, string> = {
    DETECTED: "Finding detected",
    ACKNOWLEDGED: "Finding acknowledged",
    RESOLVED: "Finding resolved",
    REOPENED: "Finding automatically reopened",
  };

  const eventColors: Record<string, string> = {
    DETECTED: "bg-blue-500",
    ACKNOWLEDGED: "bg-amber-500",
    RESOLVED: "bg-emerald-500",
    REOPENED: "bg-rose-500",
  };

  async function handleResolve() {
    const note = resolutionNote.trim();

    if (note.length < 5) return;

    await onResolve(finding.id, note);
    setResolutionNote("");
    setShowResolutionForm(false);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col justify-between gap-3 border-b border-border p-5 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">
              FINDING INVESTIGATION
            </p>
            <SeverityBadge severity={finding.severity} />
            <StatusBadge status={finding.status} />
          </div>

          <h2 className="mt-2 text-lg font-semibold tracking-tight">
            {finding.title}
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            {finding.ruleId} · Finding ID {finding.id}
          </p>
        </div>

        <button
          onClick={onClose}
          className="self-end rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground sm:self-start"
          aria-label="Close finding details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          {/* Risk explanation */}
          <div>
            <h3 className="text-sm font-semibold">Risk explanation</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {finding.description}
            </p>
          </div>

          {/* Recommended remediation */}
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">
                Recommended remediation
              </h3>
            </div>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {finding.remediation}
            </p>

            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              Guidance only. This dashboard does not execute remediation
              actions. Validate the change and obtain the required approval
              through your operational process.
            </p>
          </div>

          {/* Detection evidence */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Detection evidence</h3>

              <span
                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                  source === "LIVE"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {source} DATA
              </span>
            </div>

            <pre className="mt-3 max-h-[320px] overflow-auto rounded-lg border border-border bg-background p-4 text-xs leading-6 text-muted-foreground">
              {JSON.stringify(finding.evidence, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-5">
          {/* Lifecycle actions */}
          <div className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold">Finding lifecycle</h3>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Track investigation progress and record the outcome of this
              finding.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {finding.status === "OPEN" && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void onAcknowledge(finding.id)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Acknowledge"}
                </button>
              )}

              {canResolve && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowResolutionForm((current) => !current)}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Resolve finding
                </button>
              )}
            </div>

            {showResolutionForm && canResolve && (
              <div className="mt-4 space-y-3">
                <label
                  htmlFor="resolution-note"
                  className="text-xs font-medium"
                >
                  Resolution note
                </label>

                <textarea
                  id="resolution-note"
                  value={resolutionNote}
                  onChange={(event) => setResolutionNote(event.target.value)}
                  placeholder="Describe how this security issue was addressed..."
                  rows={4}
                  maxLength={1000}
                  className="w-full resize-y rounded-lg border border-border bg-background p-3 text-xs leading-5 outline-none transition placeholder:text-muted-foreground focus:border-primary"
                />

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    {resolutionNote.trim().length}/1000 characters · Minimum 5
                  </span>

                  <button
                    type="button"
                    disabled={
                      actionLoading || resolutionNote.trim().length < 5
                    }
                    onClick={() => void handleResolve()}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading ? "Saving..." : "Confirm resolution"}
                  </button>
                </div>
              </div>
            )}

            {finding.status === "RESOLVED" && (
              <div className="mt-4 rounded-lg bg-emerald-500/10 p-3">
                <p className="text-xs font-semibold text-emerald-400">
                  This finding is resolved.
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  If a subsequent security scan detects the same risk again,
                  the finding will automatically reopen.
                </p>
              </div>
            )}

            {finding.resolutionNote && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Resolution note
                </p>
                <p className="mt-1 text-xs leading-5">
                  {finding.resolutionNote}
                </p>
              </div>
            )}
          </div>

          {/* Affected resource */}
          <div>
            <h3 className="text-sm font-semibold">Affected resource</h3>

            <div className="mt-3 rounded-xl border border-border p-4">
              <p className="font-medium">
                {resource?.name || "Unknown resource"}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {resource?.resourceType?.replaceAll("_", " ") || "—"}
              </p>

              <div className="mt-4 grid gap-3">
                <Info
                  label="Provider"
                  value={providerLabel(resource?.provider)}
                />
                <Info
                  label="Region"
                  value={resource?.region || "Not specified"}
                />
                <Info
                  label="Cloud account"
                  value={
                    resource?.cloudAccount?.name ||
                    resource?.cloudAccountId ||
                    "—"
                  }
                />
                <Info
                  label="Environment"
                  value={resource?.cloudAccount?.environment || "—"}
                />
                <Info label="Discovery source" value={source} />
              </div>

              {resource?.providerResourceId && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-[11px] text-muted-foreground">
                    Provider resource ID
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] leading-5">
                    {resource.providerResourceId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Detection timeline */}
          <div>
            <h3 className="text-sm font-semibold">Detection timeline</h3>

            <div className="mt-3 space-y-4 border-l border-border pl-4">
              <TimelineItem
                title="First detected"
                date={formatDate(finding.firstDetectedAt)}
              />
              <TimelineItem
                title="Last observed"
                date={formatDate(finding.lastDetectedAt)}
              />
              {finding.acknowledgedAt && (
                <TimelineItem
                  title="Acknowledged"
                  date={formatDate(finding.acknowledgedAt)}
                />
              )}
              {finding.resolvedAt && (
                <TimelineItem
                  title="Resolved"
                  date={formatDate(finding.resolvedAt)}
                />
              )}
            </div>
          </div>

          {/* Audit history */}
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Audit history</h3>

              {history && (
                <span className="text-[10px] text-muted-foreground">
                  {history.history.length} events
                </span>
              )}
            </div>

            {historyLoading ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Loading audit history...
              </p>
            ) : history?.history.length ? (
              <div className="mt-4 space-y-4 border-l border-border pl-4">
                {history.history.map((event) => (
                  <div key={event.id} className="relative">
                    <span
                      className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card ${
                        eventColors[event.eventType] || "bg-muted-foreground"
                      }`}
                    />

                    <p className="text-xs font-medium">
                      {eventLabels[event.eventType] || event.eventType}
                    </p>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </p>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Actor: {event.actorType}
                    </p>

                    {event.fromStatus && event.toStatus && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {event.fromStatus} → {event.toStatus}
                      </p>
                    )}

                    {event.note && (
                      <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs leading-5 text-muted-foreground">
                        {event.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No audit events are available for this finding.
              </p>
            )}
          </div>

          {/* Next steps */}
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-medium">What happens next?</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Validate the affected configuration, assign an owner, approve
              any change, then run another scan to verify whether the finding
              is still present.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="mt-1 break-words text-xs font-medium">{value}</p>
  </div>;
}

function TimelineItem({ title, date }: { title: string; date: string }) {
  return <div className="relative">
    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-card" />
    <p className="text-xs font-medium">{title}</p>
    <p className="mt-1 text-[11px] text-muted-foreground">{date}</p>
  </div>;
}