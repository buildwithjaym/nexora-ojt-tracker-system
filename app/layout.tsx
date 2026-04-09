import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});


export const metadata: Metadata = {
  metadataBase: new URL("https://nexora.app"),
  title: {
    default: "Nexora — Trusted OJT Tracking for Schools and Institutions",
    template: "%s | Nexora",
  },
  description:
    "Nexora is a modern OJT tracking system for schools, advisers, and students. Manage offices, assignments, attendance, progress, and reports in one trusted platform.",
  keywords: [
    "Nexora",
    "OJT tracking system",
    "practicum tracker",
    "internship monitoring system",
    "student attendance tracker",
    "school OJT system",
    "teacher adviser monitoring",
    "office assignment tracker",
  ],
  authors: [{ name: "Nexora" }],
  creator: "Nexora",
  publisher: "Nexora",
  applicationName: "Nexora",
  category: "Education Technology",
  openGraph: {
    title: "Nexora — Trusted OJT Tracking for Schools and Institutions",
    description:
      "Simplify OJT management with role-based dashboards for admins, teachers, and students.",
    url: "https://nexora.app",
    siteName: "Nexora",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexora — Trusted OJT Tracking for Schools and Institutions",
    description:
      "Simplify OJT management with role-based dashboards for admins, teachers, and students.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {children}
        <Toaster
  position="top-right"
  richColors
  closeButton
  toastOptions={{
    classNames: {
      toast: "rounded-2xl",
    },
  }}
/>
      </body>
    </html>
  );
}