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
  GraduationCap,
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
  transition: { duration: 0.55, ease: "easeOut" },
};

const benefits = [
  {
    icon: ShieldCheck,
    title: "Trusted attendance records",
    description:
      "Nexora helps schools build confidence in OJT tracking through structured logs, guided workflows, and accountability-first design.",
  },
  {
    icon: Clock3,
    title: "Less manual follow-up",
    description:
      "Reduce repetitive checking, scattered records, and unclear submissions with one organized system for daily OJT activity.",
  },
  {
    icon: CalendarCheck2,
    title: "Clear progress visibility",
    description:
      "Give students and advisers a better view of attendance, completed hours, and day-by-day OJT activity in one place.",
  },
  {
    icon: Users2,
    title: "Better coordination",
    description:
      "Keep students, advisers, and administrators aligned with a cleaner process from assignment to completion.",
  },
  {
    icon: MapPinned,
    title: "Built for reliable monitoring",
    description:
      "Designed to support location-aware tracking, checkpoint validation, and more dependable practicum oversight.",
  },
  {
    icon: WalletCards,
    title: "School-ready simplicity",
    description:
      "Nexora is made to feel easy for students and practical for institutions, without unnecessary complexity.",
  },
];

const steps = [
  {
    step: "01",
    title: "Set up your OJT program",
    description:
      "Organize students, advisers, offices, batches, and required hours with a structure that is easy to maintain.",
  },
  {
    step: "02",
    title: "Track attendance with clarity",
    description:
      "Students record their daily OJT checkpoints while the system keeps the process guided, consistent, and easy to follow.",
  },
  {
    step: "03",
    title: "Monitor progress with confidence",
    description:
      "Teachers and coordinators gain a cleaner view of attendance, progress, and student activity without relying on scattered tools.",
  },
];

const highlights = [
  "Cleaner OJT management for institutions",
  "More confidence in student attendance records",
  "Faster monitoring for teachers and advisers",
  "A simpler daily experience for practicum students",
];

const faqs = [
  {
    question: "Who is Nexora built for?",
    answer:
      "Nexora is designed for schools, colleges, coordinators, advisers, and practicum students who want a more reliable and organized way to manage OJT tracking.",
  },
  {
    question: "What problem does Nexora solve?",
    answer:
      "It reduces the confusion of manual attendance tracking, scattered student records, and inconsistent practicum monitoring by bringing everything into one focused platform.",
  },
  {
    question: "Is Nexora only for students?",
    answer:
      "No. Nexora is built for the full OJT process. Students use it to track records and progress, while teachers and administrators use it to monitor and manage the program.",
  },
  {
    question: "Why is Nexora different from generic attendance systems?",
    answer:
      "Nexora is designed specifically for OJT and practicum workflows. It focuses on assignments, required hours, progress visibility, attendance structure, and school-friendly monitoring.",
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
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </div>
      <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
        {description}
      </p>
    </div>
  );
}

function AnimatedProgress() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-card/90 p-6 shadow-[0_20px_80px_-20px_rgba(37,99,235,0.35)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 overflow-hidden rounded-2xl ring-1 ring-white/10">
          <Image
            src="/logo.png"
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

      <div className="mt-8 space-y-5">
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

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
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

export default function HomePage() {
  return (
    <main className="relative overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.16),transparent_25%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.10),transparent_30%)]" />

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-2xl ring-1 ring-white/10">
              <Image
                src="/logo.png"
                alt="Nexora logo"
                fill
                className="object-cover"
                sizes="44px"
              />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">Nexora</p>
              <p className="text-xs text-muted-foreground">
                Trusted OJT Tracking System
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
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

          <div className="flex items-center gap-3">
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
        <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <BadgeCheck className="h-4 w-4" />
              Built for institutions, advisers, and practicum students
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              A more
              <span className="bg-gradient-to-r from-primary via-blue-400 to-accent bg-clip-text text-transparent">
                {" "}
                trusted and simpler
              </span>{" "}
              way to manage OJT tracking.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Nexora helps schools organize OJT workflows with a cleaner system
              for attendance, monitoring, progress tracking, and practicum
              coordination — designed to be easy for students and reliable for
              institutions.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition hover:-translate-y-0.5 hover:opacity-95"
              >
                Start with Nexora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>

              <a
                href="#benefits"
                className="inline-flex items-center rounded-2xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                Discover the benefits
                <ChevronRight className="ml-2 h-4 w-4" />
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                "Designed for real OJT workflows",
                "Made to feel simple every day",
                "Built to improve trust and visibility",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-border bg-card/80 p-5 shadow-lg shadow-black/10"
                >
                  <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -left-10 top-10 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -right-10 bottom-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
            <AnimatedProgress />
          </motion.div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="benefits" className="mx-auto max-w-7xl px-6 py-24">
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="Why Nexora"
            title="Give your institution a better OJT experience from the very first day"
            description="Nexora is built to reduce friction, improve visibility, and make OJT management feel more structured, reliable, and easier to use."
          />
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <motion.div
                key={benefit.title}
                {...fadeUp}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                whileHover={{ y: -6 }}
                className="group rounded-[28px] border border-border bg-card p-7 shadow-lg shadow-black/10 transition"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 transition group-hover:shadow-[0_0_30px_rgba(37,99,235,0.28)]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight">
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

      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24">
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="How it works"
            title="Structured enough for institutions, simple enough for everyday use"
            description="Nexora keeps the OJT process clearer from program setup to student tracking and ongoing monitoring."
          />
        </motion.div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {steps.map((item, index) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: index * 0.07 }}
              className="rounded-[28px] border border-border bg-card p-7"
            >
              <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary w-fit">
                Step {item.step}
              </div>
              <h3 className="mt-6 text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <motion.div
          {...fadeUp}
          className="overflow-hidden rounded-[36px] border border-primary/20 bg-gradient-to-br from-primary/12 via-card to-accent/10 p-8 shadow-[0_20px_80px_-20px_rgba(37,99,235,0.30)] sm:p-12"
        >
          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
                <Star className="h-3.5 w-3.5" />
                What schools gain with Nexora
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                More confidence, less confusion, and a better system for everyone involved.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Nexora helps institutions move away from fragmented processes and
                toward a more organized, modern, and dependable way of managing
                practicum operations.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition hover:-translate-y-0.5"
                >
                  Launch Nexora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a
                  href="#faqs"
                  className="inline-flex items-center rounded-2xl border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:bg-secondary"
                >
                  Read FAQs
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Cleaner attendance workflows",
                "Stronger practicum visibility",
                "Simpler adviser monitoring",
                "A smoother student experience",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-background/70 p-5"
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

      <section id="faqs" className="mx-auto max-w-5xl px-6 py-24">
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow="FAQs"
            title="Questions institutions usually ask before adopting Nexora"
            description="A clear overview of what Nexora offers and why it is built differently."
          />
        </motion.div>

        <div className="mt-14 space-y-4">
          {faqs.map((faq, index) => (
            <motion.details
              key={faq.question}
              {...fadeUp}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              className="group rounded-[24px] border border-border bg-card p-6"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <span className="text-base font-semibold">{faq.question}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition group-open:rotate-90" />
              </summary>
              <p className="mt-4 pl-12 text-sm leading-7 text-muted-foreground">
                {faq.answer}
              </p>
            </motion.details>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl ring-1 ring-white/10">
              <Image
                src="/logo.png"
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