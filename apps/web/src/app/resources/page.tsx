
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Boxes,
  Cloud,
  Database,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Provider = "AZURE" | "AWS" | "GCP";
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
  createdAt: string;
  updatedAt: string;
  cloudAccount?: {
    id: string;
    name: string;
    provider: Provider;
    accountId: string;
  };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const providerLabels: Record<Provider, string> = {
  AZURE: "Microsoft Azure",
  AWS: "Amazon Web Services",
  GCP: "Google Cloud",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function providerColor(provider: Provider) {
  switch (provider) {
    case "AZURE":
      return "text-sky-400 bg-sky-400/10";
    case "AWS":
      return "text-orange-400 bg-orange-400/10";
    case "GCP":
      return "text-blue-400 bg-blue-400/10";
  }
}

export default function ResourceInventoryPage() {
  const [resources, setResources] = useState<CloudResource[]>([]);
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [selectedAccount, setSelectedAccount] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedResource, setSelectedResource] =
    useState<CloudResource | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAccounts = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/cloud-accounts`);

    if (!response.ok) {
      throw new Error("Unable to load cloud accounts.");
    }

    const data = await response.json();
    setAccounts(data.accounts ?? data);
  }, []);

  const loadResources = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });

    if (selectedAccount !== "all") {
      params.set("cloudAccountId", selectedAccount);
    }

    if (selectedProvider !== "all") {
      params.set("provider", selectedProvider);
    }

    if (selectedSource !== "all") {
      params.set("discoverySource", selectedSource);
    }

    const response = await fetch(
      `${API_URL}/api/resources?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Unable to load resource inventory.");
    }

    const data = await response.json();

    setResources(data.resources ?? []);
    setPagination((current) => ({
      ...current,
      ...(data.pagination ?? {}),
    }));
  }, [
    pagination.page,
    pagination.limit,
    selectedAccount,
    selectedProvider,
    selectedSource,
  ]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadAccounts(), loadResources()]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [loadAccounts, loadResources]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  async function refreshInventory() {
    setRefreshing(true);
    setError("");
    setSuccess("");

    try {
      await loadResources();
      setSuccess("Resource inventory refreshed.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Refresh failed."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function discoverResources() {
    if (selectedAccount === "all") {
      setError("Select a cloud account before starting discovery.");
      return;
    }

    setDiscovering(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/resources/discover/${selectedAccount}`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Resource discovery failed.");
      }

      await loadResources();

      setSuccess(
        `Discovery completed: ${data.created ?? 0} created, ${
          data.updated ?? 0
        } updated.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Discovery failed."
      );
    } finally {
      setDiscovering(false);
    }
  }

  const filteredResources = resources.filter((resource) => {
    const query = search.toLowerCase();

    return (
      resource.name.toLowerCase().includes(query) ||
      resource.providerResourceId.toLowerCase().includes(query) ||
      resource.resourceType.toLowerCase().includes(query) ||
      resource.region?.toLowerCase().includes(query)
    );
  });

  const simulatedCount = resources.filter(
    (resource) => resource.discoverySource === "SIMULATED"
  ).length;

  const liveCount = resources.filter(
    (resource) => resource.discoverySource === "LIVE"
  ).length;

  const activeAccounts = accounts.filter(
    (account) => account.isActive
  ).length;

  return (
    <AppShell
      title="Resource Inventory"
      description="Explore and manage resources discovered across your cloud environments."
    >
      <div className="space-y-7">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Boxes className="h-4 w-4" />
              Cloud Infrastructure
              <span>/</span>
              Resource Inventory
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Resource Inventory
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              A centralized view of your registered cloud resources.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshInventory}
              disabled={refreshing || loading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <button
              onClick={discoverResources}
              disabled={discovering || selectedAccount === "all"}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              {discovering ? "Discovering..." : "Run discovery"}
            </button>
          </div>
        </div>

        {/* Discovery notice */}
        <div className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
          <div>
            <p className="text-sm font-medium">Discovery status</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Azure discovery currently uses simulated resources for
              development and testing. Live cloud discovery has not yet
              been connected.
            </p>
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button
              onClick={() => setError("")}
              className="ml-auto"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total resources"
            value={pagination.total}
            icon={Boxes}
            description="Resources matching current filters"
          />
          <SummaryCard
            label="Active cloud accounts"
            value={activeAccounts}
            icon={Cloud}
            description="Registered active environments"
          />
          <SummaryCard
            label="Simulated resources"
            value={simulatedCount}
            icon={Server}
            description="Development discovery data"
          />
          <SummaryCard
            label="Live resources"
            value={liveCount}
            icon={Database}
            description="Verified live discovery records"
          />
        </div>

        {/* Filters */}
        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search resources, types, IDs, or regions..."
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary"
              />
            </div>

            <select
              value={selectedAccount}
              onChange={(event) => {
                setSelectedAccount(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="all">All cloud accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>

            <select
              value={selectedProvider}
              onChange={(event) => {
                setSelectedProvider(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="all">All providers</option>
              <option value="AZURE">Azure</option>
              <option value="AWS">AWS</option>
              <option value="GCP">Google Cloud</option>
            </select>

            <select
              value={selectedSource}
              onChange={(event) => {
                setSelectedSource(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="all">All sources</option>
              <option value="SIMULATED">Simulated</option>
              <option value="LIVE">Live</option>
            </select>
          </div>

          {/* Inventory table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 font-medium">Resource</th>
                  <th className="px-5 py-4 font-medium">Provider</th>
                  <th className="px-5 py-4 font-medium">Resource type</th>
                  <th className="px-5 py-4 font-medium">Region</th>
                  <th className="px-5 py-4 font-medium">Source</th>
                  <th className="px-5 py-4 text-right font-medium">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-muted-foreground">
                      Loading resource inventory...
                    </td>
                  </tr>
                ) : filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <Boxes className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="font-medium">No resources found</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Select an account and run discovery to populate the inventory.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredResources.map((resource) => (
                    <tr
                      key={resource.id}
                      className="transition hover:bg-muted/30"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium">{resource.name}</p>
                        <p className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">
                          {resource.providerResourceId}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-medium ${providerColor(
                            resource.provider
                          )}`}
                        >
                          {resource.provider}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {resource.resourceType.replaceAll("_", " ")}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {resource.region || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            resource.discoverySource === "LIVE"
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }
                        >
                          {resource.discoverySource}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedResource(resource)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {filteredResources.length} of {pagination.total} resources
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    page: current.page - 1,
                  }))
                }
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <span className="text-xs text-muted-foreground">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </span>

              <button
                disabled={
                  pagination.page >= pagination.totalPages || loading
                }
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Resource details */}
        {selectedResource && (
          <section className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <p className="text-xs text-muted-foreground">RESOURCE DETAILS</p>
                <h2 className="mt-1 font-semibold">{selectedResource.name}</h2>
              </div>

              <button
                onClick={() => setSelectedResource(null)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close resource details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-2">
              <Detail label="Resource ID" value={selectedResource.providerResourceId} />
              <Detail label="Resource type" value={selectedResource.resourceType} />
              <Detail label="Provider" value={providerLabels[selectedResource.provider]} />
              <Detail label="Region" value={selectedResource.region || "Not specified"} />
              <Detail
                label="Cloud account"
                value={selectedResource.cloudAccount?.name || selectedResource.cloudAccountId}
              />
              <Detail label="Discovery source" value={selectedResource.discoverySource} />
              <Detail label="Created" value={formatDate(selectedResource.createdAt)} />
              <Detail label="Last updated" value={formatDate(selectedResource.updatedAt)} />
            </div>

            <div className="border-t border-border p-5">
              <p className="mb-3 text-sm font-medium">Resource metadata</p>
              <pre className="overflow-x-auto rounded-lg bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">
                {JSON.stringify(selectedResource.metadata, null, 2)}
              </pre>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">{value}</p>
    </div>
  );
}
