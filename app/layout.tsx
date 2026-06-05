import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PWARegister from "@/components/pwa-register";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nexora-ojt-tracker.online"),
  title: {
    default: "Nexora - Trusted OJT Tracking System for Schools and Institutions",
    template: "%s | Nexora",
  },
  description:
    "Nexora is a modern OJT tracking system for schools, advisers, coordinators, and students. Manage attendance, practicum assignments, progress tracking, reports, and monitoring in one trusted platform.",
  applicationName: "Nexora",
  authors: [{ name: "Nexora" }],
  creator: "Nexora",
  publisher: "Nexora",
  category: "Education Technology",
  keywords: [
    "Nexora",
    "OJT tracking system",
    "OJT management system",
    "internship tracking system",
    "practicum tracking system",
    "student attendance tracking",
    "attendance monitoring for schools",
    "school internship monitoring",
    "teacher adviser monitoring system",
    "student progress tracking system",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  appleWebApp: {
    capable: true,
    title: "Nexora",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <PWARegister />
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ classNames: { toast: "rounded-2xl" } }}
        />
      </body>
    </html>
  );
}