
import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";

type AppShellProps = {
  children: ReactNode;
  title: string;
  description: string;
};

export function AppShell({
  children,
  title,
  description,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader title={title} description={description} />

        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
