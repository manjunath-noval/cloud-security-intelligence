
"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Cloud,
  Database,
  RefreshCw,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Server,
  ShieldCheck,
  X,
  Eye,
  Power,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CloudAccount = {
  id: string;
  name: string;
  provider: "AZURE" | "AWS" | "GCP";
  accountId: string;
  environment: string;
  region: string | null;
  isActive: boolean;
  createdAt: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const providerNames: Record<CloudAccount["provider"], string> = {
  AZURE: "Microsoft Azure",
  AWS: "Amazon Web Services",
  GCP: "Google Cloud",
};

export default function Home() {
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<CloudAccount | null>(null);

  const [form, setForm] = useState({
    name: "",
    provider: "AZURE",
    accountId: "",
    environment: "development",
    region: "",
  });

  async function loadAccounts() {
    try {
      setError("");

      const response = await fetch(`${API_URL}/api/cloud-accounts`);

      if (!response.ok) {
        throw new Error("Unable to load cloud accounts.");
      }

      const data = await response.json();
      setAccounts(data.accounts);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function registerAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/cloud-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setForm({
        name: "",
        provider: "AZURE",
        accountId: "",
        environment: "development",
        region: "",
      });

      await loadAccounts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivateAccount(id: string) {
    if (!window.confirm("Deactivate this account in the application?")) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/cloud-accounts/${id}/deactivate`,
        { method: "PATCH" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Deactivation failed.");
      }

      setSelectedAccount(null);
      await loadAccounts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Deactivation failed."
      );
    }
  }

  function refreshAccounts() {
    setRefreshing(true);
    loadAccounts();
  }

  const activeCount = accounts.filter(
    (account) => account.isActive
  ).length;

  const inactiveCount = accounts.length - activeCount;

  return (
    <AppShell
      title="Cloud Accounts"
      description="Manage and monitor your registered cloud environments."
    >
      <div className="space-y-8">
        {/* Page introduction */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium tracking-wide text-muted-foreground">
                CLOUD INFRASTRUCTURE
              </span>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Cloud Account Management
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Register your cloud environments and manage their application
              records from one workspace.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={refreshAccounts}
            disabled={refreshing}
            className="w-fit gap-2"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh accounts
          </Button>
        </section>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total accounts
              </span>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Cloud size={18} />
              </div>
            </div>

            <p className="mt-5 text-3xl font-semibold tabular-nums">
              {accounts.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Registered cloud environments
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Active accounts
              </span>
              <div className="rounded-lg bg-success/10 p-2 text-success">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <p className="mt-5 text-3xl font-semibold tabular-nums">
              {activeCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Currently active application records
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Inactive accounts
              </span>
              <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                <Power size={18} />
              </div>
            </div>

            <p className="mt-5 text-3xl font-semibold tabular-nums">
              {inactiveCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Deactivated application records
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Providers
              </span>
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Server size={18} />
              </div>
            </div>

            <p className="mt-5 text-3xl font-semibold tabular-nums">
              {new Set(accounts.map((account) => account.provider)).size}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Providers represented in your records
            </p>
          </div>
        </section>

        {/* Registration form */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border px-5 py-5 sm:px-6">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Plus size={19} />
            </div>

            <div>
              <h3 className="font-semibold">Register cloud account</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Add an account record to your workspace.
              </p>
            </div>
          </div>

          <form onSubmit={registerAccount} className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="account-name"
                  className="text-sm font-medium"
                >
                  Account name
                </label>
                <Input
                  id="account-name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="e.g. Production Environment"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="provider"
                  className="text-sm font-medium"
                >
                  Cloud provider
                </label>
                <select
                  id="provider"
                  value={form.provider}
                  onChange={(e) =>
                    setForm({ ...form, provider: e.target.value })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="AZURE">Microsoft Azure</option>
                  <option value="AWS">Amazon Web Services</option>
                  <option value="GCP">Google Cloud Platform</option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="account-id"
                  className="text-sm font-medium"
                >
                  Cloud account ID
                </label>
                <Input
                  id="account-id"
                  required
                  placeholder="Enter account or subscription identifier"
                  value={form.accountId}
                  onChange={(e) =>
                    setForm({ ...form, accountId: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="environment"
                  className="text-sm font-medium"
                >
                  Environment
                </label>
                <select
                  id="environment"
                  value={form.environment}
                  onChange={(e) =>
                    setForm({ ...form, environment: e.target.value })
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="region"
                  className="text-sm font-medium"
                >
                  Region
                  <span className="ml-2 font-normal text-muted-foreground">
                    Optional
                  </span>
                </label>
                <Input
                  id="region"
                  placeholder="e.g. centralindia or ap-south-1"
                  value={form.region}
                  onChange={(e) =>
                    setForm({ ...form, region: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
              <p className="text-xs text-muted-foreground">
                Registration creates an application record. It does not
                establish a live connection to the cloud provider.
              </p>

              <Button
                type="submit"
                disabled={submitting}
                className="gap-2"
              >
                {submitting ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                {submitting ? "Registering..." : "Register account"}
              </Button>
            </div>
          </form>
        </section>

        {/* Registered accounts */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h3 className="font-semibold">Registered accounts</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Review and manage your cloud account records.
              </p>
            </div>

            <span className="w-fit rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              {accounts.length} records
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <RefreshCw size={17} className="animate-spin" />
              Loading cloud accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-4 rounded-xl bg-muted p-4 text-muted-foreground">
                <Database size={25} />
              </div>
              <h4 className="font-medium">No accounts registered</h4>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Register your first cloud account using the form above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-col justify-between gap-4 px-5 py-5 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:px-6"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="mt-0.5 rounded-lg border border-border bg-muted/50 p-3 text-primary">
                      <Cloud size={20} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{account.name}</h4>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            account.isActive
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {account.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {providerNames[account.provider]}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {account.environment} ·{" "}
                        {account.region || "Region not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAccount(account)}
                      className="gap-2"
                    >
                      <Eye size={14} />
                      Details
                    </Button>

                    {account.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deactivateAccount(account.id)}
                        className="gap-2 text-danger hover:bg-danger/10 hover:text-danger"
                      >
                        <Power size={14} />
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Account details */}
        {selectedAccount && (
          <section className="overflow-hidden rounded-xl border border-primary/30 bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-5 sm:px-6">
              <div>
                <h3 className="font-semibold">Account details</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Application record information
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Close account details"
                onClick={() => setSelectedAccount(null)}
              >
                <X size={18} />
              </Button>
            </div>

            <dl className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              {[
                ["Account name", selectedAccount.name],
                ["Provider", providerNames[selectedAccount.provider]],
                ["Account ID", selectedAccount.accountId],
                ["Environment", selectedAccount.environment],
                ["Region", selectedAccount.region || "Not specified"],
                [
                  "Status",
                  selectedAccount.isActive ? "Active" : "Inactive",
                ],
                [
                  "Created",
                  new Date(selectedAccount.createdAt).toLocaleString(),
                ],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 break-all text-sm font-medium">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Scope clarification */}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-primary"
          />
          <div>
            <p className="text-sm font-medium">
              Cloud connection status
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              These records represent accounts registered in this
              application. Live cloud discovery and security assessment
              will be implemented through provider integrations in a
              later development milestone.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
