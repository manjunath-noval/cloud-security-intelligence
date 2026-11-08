import { ThemeProvider } from "@/components/providers/theme-provider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cloud Security Intelligence",
    template: "%s | Cloud Security Intelligence",
  },
  description:
    "Enterprise cloud security and compliance intelligence. Detect risks, investigate findings, and manage security remediation.",
  applicationName: "Cloud Security Intelligence",
  keywords: [
    "Cloud Security",
    "Cloud Compliance",
    "Azure Security",
    "Multi-Cloud Security",
    "Security Intelligence",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
  lang="en"
  suppressHydrationWarning
  className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
>
      <body className="min-h-full flex flex-col">
  <ThemeProvider>
    <TooltipProvider>
      {children}
    </TooltipProvider>
  </ThemeProvider>
</body>
    </html>
  );
}
