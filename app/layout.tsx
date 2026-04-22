import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://nexora-ojt-tracker.online",
    siteName: "Nexora",
    title: "Nexora - Trusted OJT Tracking System for Schools and Institutions",
    description:
      "Simplify OJT attendance, student progress tracking, adviser monitoring, and institutional coordination with Nexora.",
    locale: "en_US",
    images: [
      {
        url: "/Nexora.png",
        width: 1200,
        height: 630,
        alt: "Nexora OJT Tracking System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexora - Trusted OJT Tracking System for Schools and Institutions",
    description:
      "Simplify OJT attendance, student progress tracking, adviser monitoring, and institutional coordination with Nexora.",
    images: ["/Nexora.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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