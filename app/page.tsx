"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HelpCircle,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Star,
  Users2,
  WalletCards,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

const benefits = [
  {
    icon: ShieldCheck,
    title: "Trusted attendance records",
    description:
      "Build stronger confidence in OJT tracking with a platform designed for accountability, consistency, and cleaner attendance validation.",
  },
  {
    icon: Clock3,
    title: "Less manual follow-up",
    description:
      "Reduce repetitive checking, scattered logs, and unclear records with one organized OJT workflow for schools, advisers, and students.",
  },
  {
    icon: CalendarCheck2,
    title: "Clear progress visibility",
    description:
      "Give students, advisers, and administrators a better way to see attendance, completed hours, practicum activity, and overall progress.",
  },
  {
    icon: Users2,
    title: "Better coordination",
    description:
      "Keep institutions, teachers, and students aligned through a more structured and dependable practicum monitoring experience.",
  },
  {
    icon: MapPinned,
    title: "Reliable monitoring",
    description:
      "Support location-aware attendance, checkpoint validation, and a more dependable way to monitor on-site OJT activity.",
  },
  {
    icon: WalletCards,
    title: "Easy to adopt",
    description:
      "Nexora is designed to feel simple for students and practical for institutions without unnecessary complexity.",
  },
];

const steps = [
  {
    step: "01",
    title: "Set up your practicum structure",
    description:
      "Organize students, advisers, offices, batches, and required hours in one OJT system that is easier to manage.",
  },
  {
    step: "02",
    title: "Track attendance with clarity",
    description:
      "Students record daily attendance while the system keeps each checkpoint guided, structured, and easier to trust.",
  },
  {
    step: "03",
    title: "Monitor progress confidently",
    description:
      "Teachers and institutions gain a cleaner view of attendance, practicum progress, and student activity without relying on scattered tools.",
  },
];

const highlights = [
  "Cleaner OJT management for institutions",
  "Better visibility for advisers and coordinators",
  "A simpler daily experience for students",
  "More confidence in attendance and progress records",
];

const faqs = [
  {
    question: "Who is Nexora built for?",
    answer:
      "Nexora is designed for schools, colleges, coordinators, advisers, and practicum students who need a cleaner and more reliable way to manage OJT tracking.",
  },
  {
    question: "What problem does Nexora solve?",
    answer:
      "It reduces the confusion of manual attendance tracking, disconnected records, and inconsistent practicum monitoring by bringing everything into one focused platform.",
  },
  {
    question: "Is Nexora only for students?",
    answer:
      "No. Nexora supports the full OJT workflow. Students use it to manage records and progress, while advisers and administrators use it to monitor and coordinate the program.",
  },
  {
    question: "Why is Nexora different from generic attendance tools?",
    answer:
      "Nexora is built specifically for OJT and practicum operations. It focuses on attendance structure, progress visibility, coordination, and institution-friendly monitoring.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </div>
      <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
        {description}
      </p>
    </div>
  );
}

function AnimatedProgress() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-card/90 p-4 shadow-[0_20px_80px_-20px_rgba(37,99,235,0.35)] backdrop-blur sm:p-6">
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 overflow-hidden rounded-2xl ring-1 ring-white/10">
          <Image
            src="/Nexora.png"
            alt="Nexora logo"
            fill
            className="object-cover"
            sizes="44px"
          />
        </div>
        <div>
          <p className="text-sm font-semibold">Nexora Experience</p>
          <p className="text-xs text-muted-foreground">
            Simpler workflows. Stronger visibility.
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-5">
        {[
          { label: "Clarity for students", value: "92%" },
          { label: "Efficiency for advisers", value: "88%" },
          { label: "Confidence for institutions", value: "94%" },
        ].map((item, index) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: item.value }}
                transition={{ duration: 1, delay: 0.2 + index * 0.2 }}
                className="h-full rounded-full bg-gradient-to-r from-primary via-blue-400 to-accent shadow-[0_0_24px_rgba(37,99,235,0.35)]"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {[
          "Easy to adopt",
          "Built for real OJT workflows",
          "Clean and focused UI",
          "Better daily experience",
        ].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Nexora",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: "https://nexora-ojt-tracker.online",
    description:
      "Nexora is a modern OJT tracking system for schools, advisers, coordinators, and students.",
    brand: {
      "@type": "Brand",
      name: "Nexora",
    },
  };

  return (
    <main className="relative overflow-x-hidden bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.20),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(20,184,166,0.14),transparent_24%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.08),transparent_28%)]" />

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10">
              <Image
                src="/Nexora.png"
                alt="Nexora logo"
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight sm:text-base">
                Nexora
              </p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                Trusted OJT Tracking System
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#benefits" className="transition hover:text-foreground">
              Benefits
            </a>
            <a href="#how-it-works" className="transition hover:text-foreground">
              How it works
            </a>
            <a href="#faqs" className="transition hover:text-foreground">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-secondary sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:scale-[1.02] hover:opacity-95"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <BadgeCheck className="h-4 w-4" />
              Built for schools, advisers, coordinators, and practicum students
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              A more
              <span className="bg-gradient-to-r from-primary via-blue-400 to-accent bg-clip-text text-transparent">
                {" "}
                trusted and simpler
              </span>{" "}
              way to manage OJT tracking.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              Nexora is a modern OJT tracking system that helps schools, advisers,
              coordinators, and students manage attendance, practicum progress,
              monitoring, and reports in one reliable platform built for everyday use.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
              >
                Start with Nexora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>

              <a
                href="#benefits"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary sm:w-auto"
              >
                Discover the benefits
                <ChevronRight className="ml-2 h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Built for real OJT workflows",
                "Simple enough for everyday use",
                "Designed to improve trust and visibility",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-border bg-card/80 p-4 shadow-lg shadow-black/10"
                >
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -left-8 top-8 h-28 w-28 rounded-full bg-primary/20 blur-3xl sm:h-36 sm:w-36" />
            <div className="absolute -right-8 bottom-8 h-32 w-32 rounded-full bg-accent/20 blur-3xl sm:h-40 sm:w-40" />
            <AnimatedProgress />
          </motion.div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 text-sm text-muted-foreground sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {highlights.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="benefits" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="Why Nexora"
            title="Give your institution a better OJT experience from the very first day"
            description="Nexora is built to reduce friction, improve visibility, and make practicum management feel more structured, dependable, and easier to use."
          />
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <motion.div
                key={benefit.title}
                {...fadeUp}
                transition={{
                  duration: 0.45,
                  delay: index * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -6 }}
                className="group rounded-[28px] border border-border bg-card p-6 shadow-lg shadow-black/10 transition"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 transition group-hover:shadow-[0_0_30px_rgba(37,99,235,0.28)]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
      >
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="How it works"
            title="Structured enough for institutions, simple enough for everyday use"
            description="Nexora keeps the practicum process clearer from setup to student tracking and ongoing monitoring."
          />
        </motion.div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {steps.map((item, index) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{
                duration: 0.5,
                delay: index * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="rounded-[28px] border border-border bg-card p-6"
            >
              <div className="w-fit rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
                Step {item.step}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <motion.div
          {...fadeUp}
          className="overflow-hidden rounded-[32px] border border-primary/20 bg-gradient-to-br from-primary/12 via-card to-accent/10 p-6 shadow-[0_20px_80px_-20px_rgba(37,99,235,0.30)] sm:p-8 lg:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                <Star className="h-3.5 w-3.5" />
                What schools gain with Nexora
              </div>

              <h2 className="mt-5 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
                More confidence, less confusion, and a better system for everyone involved.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                Nexora helps institutions move away from fragmented processes
                and toward a more organized, modern, and dependable way of
                managing practicum operations.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition hover:-translate-y-0.5 sm:w-auto"
                >
                  Launch Nexora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a
                  href="#faqs"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold transition hover:bg-secondary sm:w-auto"
                >
                  Read FAQs
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Cleaner attendance workflows",
                "Stronger practicum visibility",
                "Simpler adviser monitoring",
                "A smoother student experience",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-background/70 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-accent/10 p-2 text-accent">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section id="faqs" className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="FAQs"
            title="Questions institutions usually ask before adopting Nexora"
            description="A clear overview of what Nexora offers and why it is built differently."
          />
        </motion.div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <motion.details
              key={faq.question}
              {...fadeUp}
              transition={{
                duration: 0.45,
                delay: index * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="group rounded-[24px] border border-border bg-card p-5 sm:p-6"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold sm:text-base">
                    {faq.question}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-open:rotate-90" />
              </summary>
              <p className="mt-4 pl-0 text-sm leading-7 text-muted-foreground sm:pl-11">
                {faq.answer}
              </p>
            </motion.details>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl ring-1 ring-white/10">
              <Image
                src="/Nexora.png"
                alt="Nexora logo"
                fill
                className="object-cover"
                sizes="36px"
              />
            </div>
            <div>
              <p className="font-medium text-foreground">Nexora</p>
              <p className="text-xs">Trusted OJT Tracking System</p>
            </div>
          </div>
          <p>© {new Date().getFullYear()} Nexora. Built for schools and institutions.</p>
        </div>
      </footer>
    </main>
  );
}