
"use client";

import { useTheme } from "next-themes";
import {
  Bell,
  ChevronRight,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AppHeaderProps = {
  title: string;
  description: string;
};

export function AppHeader({ title, description }: AppHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-4 border-b border-border bg-background/90 px-5 py-3 backdrop-blur-xl md:px-8">
      <div className="min-w-0 pl-12 md:pl-0">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Workspace</span>
          <ChevronRight size={13} />
          <span className="text-foreground">{title}</span>
        </div>

        <div>
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            {description}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative hidden w-56 lg:block xl:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search workspace..."
            aria-label="Search workspace"
            className="h-9 border-border bg-card pl-9 text-xs"
            disabled
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          disabled
          className="text-muted-foreground"
        >
          <Bell size={18} />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Toggle theme"
          onClick={() =>
            setTheme(theme === "dark" ? "light" : "dark")
          }
          disabled={!mounted}
          className="border-border bg-card"
        >
          {mounted && theme === "light" ? (
            <Moon size={17} />
          ) : (
            <Sun size={17} />
          )}
        </Button>
      </div>
    </header>
  );
}
