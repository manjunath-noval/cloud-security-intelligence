
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Menu,
  X,
  LockKeyhole,
} from "lucide-react";
import { navigationGroups } from "./navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-lg md:hidden"
      >
        <Menu size={19} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200",
          collapsed ? "w-[76px]" : "w-[260px]",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
          "md:relative md:z-auto",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck size={21} strokeWidth={2.2} />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">
                  Cloud Sentinel
                </p>
                <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground">
                  SECURITY INTELLIGENCE
                </p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:hidden"
          >
            <X size={18} />
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground md:block"
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
          {navigationGroups.map((group) => (
            <section key={group.label}>
              {!collapsed && (
                <h2 className="mb-2 px-3 text-[10px] font-semibold tracking-[0.15em] text-muted-foreground">
                  {group.label}
                </h2>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;

                  const className = [
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    item.disabled
                      ? "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-muted-foreground"
                      : "",
                    collapsed ? "justify-center px-0" : "",
                  ].join(" ");

                  if (item.disabled) {
                    return (
                      <div
                        key={item.href}
                        aria-disabled="true"
                        title={collapsed ? `${item.title} — Coming soon` : undefined}
                        className={className}
                      >
                        <Icon size={18} className="shrink-0" />

                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.title}</span>
                            <LockKeyhole
                              size={13}
                              className="text-muted-foreground"
                            />
                          </>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.title : undefined}
                      aria-current={active ? "page" : undefined}
                      className={className}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-sidebar-border p-4">
          {!collapsed ? (
            <div>
              <p className="text-xs font-medium text-foreground">
                Security workspace
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Multi-cloud protection
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <ShieldCheck size={18} className="text-muted-foreground" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
