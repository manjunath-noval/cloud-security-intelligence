
"use client";

import { useEffect, useState } from "react";

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

export default function Home() {
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [loading, setLoading] = useState(true);
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
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function registerAccount(e: React.FormEvent<HTMLFormElement>) {
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

  const activeCount = accounts.filter((account) => account.isActive).length;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Cloud Security Intelligence
          </p>
          <h1 className="text-3xl font-bold md:text-4xl">
            Cloud Accounts
          </h1>
          <p className="mt-2 text-slate-400">
            Register and manage your cloud provider accounts.
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total accounts</p>
            <p className="mt-2 text-3xl font-bold">{accounts.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Active accounts</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {activeCount}
            </p>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-semibold">
            Register Cloud Account
          </h2>

          <form onSubmit={registerAccount} className="grid gap-4 md:grid-cols-2">
            <input
              required
              minLength={2}
              maxLength={100}
              placeholder="Account name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
            />

            <select
              value={form.provider}
              onChange={(e) =>
                setForm({ ...form, provider: e.target.value })
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
            >
              <option value="AZURE">Microsoft Azure</option>
              <option value="AWS">Amazon Web Services</option>
              <option value="GCP">Google Cloud Platform</option>
            </select>

            <input
              required
              placeholder="Cloud account ID"
              value={form.accountId}
              onChange={(e) =>
                setForm({ ...form, accountId: e.target.value })
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
            />

            <select
              value={form.environment}
              onChange={(e) =>
                setForm({ ...form, environment: e.target.value })
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>

            <input
              placeholder="Region (optional)"
              value={form.region}
              onChange={(e) =>
                setForm({ ...form, region: e.target.value })
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
            />

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-cyan-600 px-5 py-3 font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
            >
              {submitting ? "Registering..." : "Register Account"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Registered Accounts</h2>
            <button
              onClick={loadAccounts}
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <p className="text-slate-400">No cloud accounts registered yet.</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-col justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center"
                >
                  <div>
                    <h3 className="font-semibold">{account.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {account.provider} · {account.environment} ·{" "}
                      {account.region || "Region not specified"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        account.isActive
                          ? "bg-emerald-950 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {account.isActive ? "Active" : "Inactive"}
                    </span>

                    <button
                      onClick={() => setSelectedAccount(account)}
                      className="text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      Details
                    </button>

                    {account.isActive && (
                      <button
                        onClick={() => deactivateAccount(account.id)}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedAccount && (
          <div className="mt-6 rounded-xl border border-cyan-900 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Account Details</h2>
              <button
                onClick={() => setSelectedAccount(null)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-slate-400">Account name</dt>
                <dd>{selectedAccount.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Provider</dt>
                <dd>{selectedAccount.provider}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Account ID</dt>
                <dd className="break-all">{selectedAccount.accountId}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Environment</dt>
                <dd>{selectedAccount.environment}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Region</dt>
                <dd>{selectedAccount.region || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Created</dt>
                <dd>{new Date(selectedAccount.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </main>
  );
}
