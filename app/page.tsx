"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Mail,
  MapPinned,
  MessageSquareText,
  School,
  ShieldCheck,
  Sparkles,
  Users2,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

const painPoints = [
  {
    title: "Records are scattered everywhere",
    text: "Attendance is on paper, updates are in Messenger, files are in Excel, and evaluation forms come from different channels. The result: coordinators spend more time chasing records than supervising students.",
  },
  {
    title: "Problems are discovered too late",
    text: "A student may already be behind in hours, missing attendance, or waiting for evaluation before the school notices. Nexora helps surface these issues earlier.",
  },
  {
    title: "Partner-office feedback is hard to collect",
    text: "Critics or office evaluators often submit feedback late, informally, or in inconsistent formats. That makes student evaluation harder to track and defend.",
  },
  {
    title: "Reports take too much manual effort",
    text: "When administrators need summaries, staff still have to check attendance logs, compare spreadsheets, ask teachers for updates, and manually reconcile missing records.",
  },
];

const roleCards = [
  {
    title: "Admin",
    icon: LayoutDashboard,
    value: "Full OJT command center",
    text: "Manage students, teachers, offices, critics, assignments, attendance records, progress, evaluations, and reports from one dashboard.",
  },
  {
    title: "Teacher",
    icon: Users2,
    value: "Student monitoring made easier",
    text: "Monitor assigned students, check attendance and progress, identify who needs follow-up, and support students before problems become bigger.",
  },
  {
    title: "Student",
    icon: ClipboardCheck,
    value: "Clearer OJT responsibility",
    text: "Submit attendance, track completed hours, view progress, and see evaluation status without depending only on chat updates or paper records.",
  },
  {
    title: "Critic",
    icon: MessageSquareText,
    value: "Structured partner-office evaluation",
    text: "Partner-office evaluators can submit student evaluations digitally using consistent criteria, comments, and recommendations.",
  },
];

const benefits = [
  {
    title: "Less manual checking",
    icon: Clock3,
    text: "Reduce repetitive monitoring work from paper logs, Excel files, Messenger follow-ups, and last-minute record checking.",
  },
  {
    title: "Clear student progress",
    icon: CalendarCheck2,
    text: "Track completed hours, remaining hours, missing attendance, pending evaluations, and students who need immediate attention.",
  },
  {
    title: "Location-aware attendance context",
    icon: MapPinned,
    text: "Support clearer attendance monitoring with location-based submission context, helping schools review records with better confidence.",
  },
  {
    title: "Structured critic evaluations",
    icon: BadgeCheck,
    text: "Collect partner-office feedback using consistent scoring, comments, and recommendations instead of scattered or informal submissions.",
  },
  {
    title: "Cleaner documentation",
    icon: FileText,
    text: "Keep OJT records easier to prepare for review, completion checking, internal reports, documentation, and school-level monitoring.",
  },
  {
    title: "Role-based workflow",
    icon: ShieldCheck,
    text: "Admin, teacher, student, and critic portals are separated so every user sees the right tools for their responsibility.",
  },
];

const outcomes = [
  "Know who is assigned and where they are deployed.",
  "See who is attending and who is falling behind.",
  "Track pending critic evaluations before clearance time.",
  "Reduce repeated follow-ups across chat and spreadsheets.",
  "Prepare cleaner records for monitoring and reporting.",
  "Give each role a focused portal instead of one confusing system.",
];

const workflow = [
  "Admin creates batches, students, teachers, offices, and critics.",
  "Students are assigned to partner offices and linked with the right teacher and critic.",
  "Students submit attendance and build their OJT record over time.",
  "Teachers monitor assigned students and follow up when progress is weak.",
  "Critics submit structured evaluations from the partner-office side.",
  "Admins review organized attendance, progress, evaluation, and reporting data.",
];

const faqs = [
  {
    id: "not-just-attendance",
    q: "Is Nexora only an attendance system?",
    a: "No. Nexora is an OJT monitoring and evaluation platform. Attendance is only one part. It also supports student assignments, teacher monitoring, admin visibility, critic evaluations, progress tracking, and organized reporting.",
  },
  {
    id: "why-change",
    q: "We already use paper, Excel, and Messenger. Why change?",
    a: "Those tools can work at the start, but they become painful when the number of students grows. Records become scattered, follow-ups repeat, evaluations are delayed, and reports take too long to prepare. Nexora gives the school one focused place for the OJT workflow.",
  },
  {
    id: "four-roles",
    q: "What are the four roles in Nexora?",
    a: "Nexora has four role-based portals: Admin, Teacher, Student, and Critic. Admin manages the whole OJT operation. Teacher monitors assigned students. Student submits attendance and tracks progress. Critic submits partner-office evaluation feedback.",
  },
  {
    id: "critic-role",
    q: "What does Critic mean in Nexora?",
    a: "Critic refers to the partner-office evaluator or supervisor who evaluates the student’s OJT performance. Instead of sending feedback through random forms or messages, the critic can submit structured evaluation data digitally.",
  },
  {
    id: "coordinator-value",
    q: "What problem does it solve for OJT coordinators?",
    a: "It helps coordinators quickly see who is assigned, who is attending, who is behind in hours, who still has pending evaluation, and which records need attention. This reduces manual checking and makes supervision more proactive.",
  },
  {
    id: "pilot",
    q: "Can a school pilot Nexora with one department first?",
    a: "Yes. A practical starting point is one department, one batch, or one OJT group. This allows the school to test the workflow, check adoption, gather feedback, and improve the process before wider rollout.",
  },
  {
    id: "privacy",
    q: "How does Nexora handle privacy concerns?",
    a: "Nexora should be used with proper role-based access and responsible handling of student records. The system is designed to separate responsibilities by role, so users only access the information relevant to their OJT function.",
  },
  {
    id: "demo",
    q: "How do we request a demo?",
    a: "Click Request Demo. Your email app will open with a ready-to-edit message addressed to the Nexora team. Just add your school name, role, number of OJT students, main monitoring problem, and preferred schedule.",
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
    <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </div>

      <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>

      <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
        {description}
      </p>
    </motion.div>
  );
}

function FAQAccordion() {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  function toggleFAQ(id: string) {
    setOpenId((current) => (current === id ? null : id));

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <div className="mt-10 divide-y divide-border overflow-hidden rounded-[28px] border border-border bg-card">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;

        return (
          <div key={`faq-${faq.id}`} id={faq.id} className="scroll-mt-24">
            <button
              type="button"
              onClick={() => toggleFAQ(faq.id)}
              aria-expanded={isOpen}
              aria-controls={`answer-${faq.id}`}
              className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-secondary/60 sm:p-6"
            >
              <span className="text-sm font-bold leading-6 sm:text-base">
                {faq.q}
              </span>

              <ChevronDown
                className={`h-5 w-5 shrink-0 text-primary transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key={`faq-answer-${faq.id}`}
                  id={`answer-${faq.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                    <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                      {faq.a}
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function LandingPage() {
  const demoMailHref = useMemo(() => {
    const subject = encodeURIComponent("Nexora Demo Request");
    const body = encodeURIComponent(`Hello Nexora Team,

I would like to request a demo of Nexora.

Here are my details:

Name:
School / Organization:
Role / Position:
Estimated number of OJT students:
Current OJT monitoring process: Paper / Excel / Messenger / Other
Main OJT monitoring problem we want to solve:
Preferred demo date and time:
Preferred contact number:

Additional message:

Thank you.`);

    return `mailto:jaymmaruji@gmail.com?subject=${subject}&body=${body}`;
  }, []);

  return (
    <main className="relative overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.20),transparent_34%),radial-gradient(circle_at_80%_16%,rgba(20,184,166,0.14),transparent_24%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.08),transparent_30%)]" />

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border">
              <Image
                src="/Nexora.png"
                alt="Nexora logo"
                fill
                priority
                className="object-cover"
                sizes="40px"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold sm:text-base">Nexora</p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                OJT Monitoring Platform
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
            <a href="#problem" className="transition hover:text-foreground">
              Problem
            </a>
            <a href="#solution" className="transition hover:text-foreground">
              4 Roles
            </a>
            <a href="#benefits" className="transition hover:text-foreground">
              Benefits
            </a>
            <a href="#faq" className="transition hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={demoMailHref}
              className="hidden items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-secondary md:inline-flex"
            >
              Request Demo
            </a>

            

            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.03fr_0.97fr] lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <School className="h-4 w-4" />
            For schools managing OJT, practicum, and internships
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Stop chasing OJT updates across paper, Excel, and Messenger.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Nexora gives schools one place to monitor attendance, assignments,
            student progress, and critic evaluations — so coordinators can see
            what is happening before records become a problem.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={demoMailHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Request a Demo
              <Mail className="h-4 w-4" />
            </a>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-secondary"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>

            
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              "4 role-based portals",
              "Digital critic evaluation",
              "Progress and report visibility",
            ].map((item) => (
              <div
                key={`hero-proof-${item}`}
                className="rounded-2xl border border-border bg-card/70 p-4 text-sm font-semibold"
              >
                <CheckCircle2 className="mb-2 h-4 w-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.1 }}
          className="rounded-[32px] border border-border bg-card p-5 shadow-[0_24px_90px_-28px_rgba(37,99,235,0.45)]"
        >
          <div className="rounded-[26px] border border-border bg-background p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Admin View</p>
                <h3 className="text-xl font-bold">OJT Monitoring Overview</h3>
              </div>

              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                Live
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: "Students", value: "248" },
                { label: "Assignments", value: "196" },
                { label: "Partner Offices", value: "32" },
                { label: "Evaluations", value: "87" },
              ].map((item) => (
                <div
                  key={`dashboard-stat-${item.label}`}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-black">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-bold">What schools can see faster</p>

              <div className="mt-4 space-y-3">
                {[
                  { label: "Students below expected progress", value: "18" },
                  { label: "Pending critic evaluations", value: "24" },
                  { label: "Students without placement", value: "7" },
                ].map((item) => (
                  <div
                    key={`attention-${item.label}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm font-semibold text-primary">
                The value is simple:
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Know who is attending, who is behind, who needs follow-up, and
                whose evaluation is still missing.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="problem" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="The Problem"
          title="OJT monitoring gets difficult when every update lives in a different place."
          description="Most OJT problems are not caused by lack of effort. They happen because attendance, assignments, progress, and evaluations are not visible in one system."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {painPoints.map((item) => (
            <motion.div
              {...fadeUp}
              key={`pain-${item.title}`}
              className="rounded-3xl border border-border bg-card p-6"
            >
              <div className="flex gap-4">
                <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="solution" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="The 4 Roles"
          title="Nexora connects the people involved in OJT without mixing their responsibilities."
          description="Each role gets a focused portal. Admins manage the operation, teachers monitor students, students submit records, and critics evaluate performance."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {roleCards.map((role) => {
            const Icon = role.icon;

            return (
              <motion.div
                {...fadeUp}
                key={`role-${role.title}`}
                className="rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/30"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-bold">{role.title}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {role.value}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {role.text}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="rounded-[36px] border border-border bg-card p-6 sm:p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <motion.div {...fadeUp}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Building2 className="h-4 w-4" />
                What Changes
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                From reactive checking to proactive OJT monitoring.
              </h2>

              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                Nexora gives schools a clearer way to see problems before they
                become reporting issues, clearance delays, or missing evaluation
                concerns.
              </p>
            </motion.div>

            <div className="grid gap-3 sm:grid-cols-2">
              {outcomes.map((item) => (
                <motion.div
                  {...fadeUp}
                  key={`outcome-${item}`}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    {item}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Benefits"
          title="Less follow-up. Better visibility. Cleaner records."
          description="Nexora is designed for the daily work of OJT coordinators: monitoring students, checking progress, collecting evaluations, and preparing records."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <motion.div
                {...fadeUp}
                key={`benefit-${benefit.title}`}
                className="rounded-3xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/30"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-bold">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {benefit.text}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="rounded-[36px] border border-border bg-card p-6 sm:p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <motion.div {...fadeUp}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Building2 className="h-4 w-4" />
                School Workflow
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                From student placement to final evaluation.
              </h2>

              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                Nexora follows the real flow of OJT operations, so schools do
                not need to force their process into a generic attendance tool.
              </p>
            </motion.div>

            <div className="grid gap-3">
              {workflow.map((item, index) => (
                <motion.div
                  {...fadeUp}
                  key={`workflow-${index}-${item}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">
                    {item}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <motion.div
          {...fadeUp}
          className="overflow-hidden rounded-[36px] border border-primary/20 bg-gradient-to-br from-primary/20 via-card to-card p-8 text-center sm:p-12"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Sparkles className="h-8 w-8" />
          </div>

          <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            See how Nexora can simplify your school’s OJT monitoring.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Start with a short walkthrough. See the admin dashboard, teacher
            monitoring, student attendance, office assignments, critic
            evaluation, and reporting flow.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={demoMailHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Request a Demo
              <Mail className="h-4 w-4" />
            </a>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-secondary"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      <section id="faq" className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Direct answers to the real concerns schools have before trying Nexora."
          description="Click a question and the answer opens immediately, similar to Google’s People Also Ask experience. Each answer is written to remove doubt and connect Nexora to a real OJT problem."
        />

        <FAQAccordion />
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 transition hover:text-foreground">
          <p>© {new Date().getFullYear()} Nexora. OJT Monitoring Platform.</p>
          <p>Developer: Jaymar H. Maruji</p>
          <p>Centralized attendance. Clear evaluations. Better monitoring.</p>
        </div>
      </footer>
    </main>
  );
}
