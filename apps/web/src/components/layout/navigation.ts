
import {
  LayoutDashboard,
  Cloud,
  Boxes,
  ShieldAlert,
  Users,
  Network,
  FileCheck,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "OVERVIEW",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        disabled: true,
      },
    ],
  },
  {
    label: "CLOUD INFRASTRUCTURE",
    items: [
      {
        title: "Cloud Accounts",
        href: "/",
        icon: Cloud,
      },
      {
        title: "Resource Inventory",
        href: "/resources",
        icon: Boxes,
        disabled: true,
      },
    ],
  },
  {
    label: "SECURITY INTELLIGENCE",
    items: [
      {
        title: "Security Findings",
        href: "/findings",
        icon: ShieldAlert,
        disabled: true,
      },
      {
        title: "IAM Intelligence",
        href: "/iam",
        icon: Users,
        disabled: true,
      },
      {
        title: "Attack Paths",
        href: "/attack-paths",
        icon: Network,
        disabled: true,
      },
    ],
  },
  {
    label: "GOVERNANCE",
    items: [
      {
        title: "Compliance",
        href: "/compliance",
        icon: FileCheck,
        disabled: true,
      },
      {
        title: "Policy Management",
        href: "/policies",
        icon: ScrollText,
        disabled: true,
      },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        disabled: true,
      },
    ],
  },
];
