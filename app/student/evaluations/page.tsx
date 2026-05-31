"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MessageSquareText,
  Sparkles,
  Star,
  Target,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Evaluation = {
  id: string;
  student_id: string;
  critic_id: string;
  office_id: string;
  attendance_score: number;
  work_quality_score: number;
  professionalism_score: number;
  communication_score: number;
  initiative_score: number;
  overall_score: number;
  strengths: string | null;
  improvement_areas: string | null;
  general_comment: string | null;
  recommendation: string;
  status: string;
  submitted_at: string;
  practicum_grade: number | null;
};

type Critic = {
  id: string;
  profile_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email: string;
  position: string | null;
};

type Profile = {
  id: string;
  avatar_url: string | null;
  full_name: string | null;
};

type Office = {
  id: string;
  name: string;
};

function fullName(person?: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
}) {
  return [
    person?.first_name,
    person?.middle_name,
    person?.last_name,
    person?.suffix,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatDate(date?: string) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function recommendationLabel(value?: string) {
  switch (value) {
    case "highly_recommended":
      return "Highly Recommended";
    case "recommended":
      return "Recommended";
    case "needs_improvement":
      return "Needs Improvement";
    case "not_recommended":
      return "Not Recommended";
    default:
      return "Recommended";
  }
}

function scoreLabel(score: number) {
  if (score >= 4.7) return "Excellent";
  if (score >= 4.2) return "Very Good";
  if (score >= 3.5) return "Good";
  if (score >= 2.5) return "Needs Support";
  return "Needs Improvement";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  const width = Math.max(0, Math.min(100, (Number(value) / 5) * 100));

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm font-bold text-primary">{value}/5</p>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function StudentEvaluationsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [critic, setCritic] = useState<Critic | null>(null);
  const [criticProfile, setCriticProfile] = useState<Profile | null>(null);
  const [office, setOffice] = useState<Office | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("You need to log in first.");
        setLoading(false);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (studentError) {
        setError(studentError.message);
        setLoading(false);
        return;
      }

      if (!student?.id) {
        setError("Student record was not found.");
        setLoading(false);
        return;
      }

      const { data: evaluationData, error: evaluationError } = await supabase
        .from("evaluations")
        .select(`
          id,
          student_id,
          critic_id,
          office_id,
          attendance_score,
          work_quality_score,
          professionalism_score,
          communication_score,
          initiative_score,
          overall_score,
          strengths,
          improvement_areas,
          general_comment,
          recommendation,
          status,
          submitted_at,
          practicum_grade
        `)
        .eq("student_id", student.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (evaluationError) {
        setError(evaluationError.message);
        setLoading(false);
        return;
      }

      if (!evaluationData) {
        setEvaluation(null);
        setLoading(false);
        return;
      }

      setEvaluation(evaluationData as Evaluation);

      const [criticRes, officeRes] = await Promise.all([
        supabase
          .from("critics")
          .select(`
            id,
            profile_id,
            first_name,
            middle_name,
            last_name,
            suffix,
            email,
            position
          `)
          .eq("id", evaluationData.critic_id)
          .maybeSingle(),

        supabase
          .from("offices")
          .select("id, name")
          .eq("id", evaluationData.office_id)
          .maybeSingle(),
      ]);

      if (criticRes.error) {
        setError(criticRes.error.message);
        setLoading(false);
        return;
      }

      if (officeRes.error) {
        setError(officeRes.error.message);
        setLoading(false);
        return;
      }

      setCritic(criticRes.data as Critic | null);
      setOffice(officeRes.data as Office | null);

      if (criticRes.data?.profile_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, avatar_url, full_name")
          .eq("id", criticRes.data.profile_id)
          .maybeSingle();

        setCriticProfile(profileData as Profile | null);
      }

      setLoading(false);
    }

    loadData();
  }, [supabase]);

  const criticName = fullName(critic ?? undefined) || "Assigned Critic";
  const overallScore = Number(evaluation?.overall_score ?? 0);
  const practicumGrade = evaluation?.practicum_grade;

  return (
    <div className="mx-auto w-full max-w-[1380px] space-y-5 p-4 sm:p-5 lg:p-6">
      <section className="animate-up rounded-[28px] border border-border bg-gradient-to-br from-card via-card to-primary/10 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ClipboardCheck className="h-4 w-4" />
              My Evaluations
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Your OJT Evaluation
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Your final practicum result, evaluator details, performance
              scores, strengths, improvement areas, and official feedback.
            </p>
          </div>

          {evaluation && (
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                {formatDate(evaluation.submitted_at)}
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {recommendationLabel(evaluation.recommendation)}
              </div>
            </div>
          )}
        </div>
      </section>

      {loading && (
        <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-border bg-card">
          <div className="text-center">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading your evaluation...
            </p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-[28px] border border-destructive/20 bg-destructive/10 p-6 text-destructive">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <h2 className="font-semibold">Unable to load evaluation</h2>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !evaluation && (
        <div className="rounded-[28px] border border-dashed border-border bg-card p-8 text-center sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <ClipboardCheck className="h-8 w-8" />
          </div>

          <h2 className="mt-5 text-xl font-semibold">No evaluation yet</h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Your evaluation will appear here once your assigned critic submits
            your OJT performance review.
          </p>
        </div>
      )}

      {!loading && !error && evaluation && (
        <>
          <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
  <div className="animate-up-delay rounded-[30px] border border-border bg-card p-5 shadow-sm sm:p-6">
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />

        {criticProfile?.avatar_url ? (
          <img
            src={criticProfile.avatar_url}
            alt={criticName}
            className="relative h-28 w-28 rounded-full border-4 border-primary/20 object-cover shadow-lg"
          />
        ) : (
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/10 text-2xl font-bold text-primary shadow-lg">
            {initials(criticName) || <UserRound className="h-10 w-10" />}
          </div>
        )}
      </div>

      <p className="mt-5 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Evaluated By
      </p>

      <h2 className="mt-2 text-2xl font-bold">{criticName}</h2>

      <p className="mt-1 text-sm text-muted-foreground">
        {critic?.position || "Assigned Critic"}
      </p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs text-muted-foreground">
        <BriefcaseBusiness className="h-4 w-4 text-primary" />
        {office?.name || "Assigned Office"}
      </div>

      <div className="mt-6 grid w-full grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="mt-1 text-sm font-semibold">
            {formatDate(evaluation.submitted_at)}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="mt-1 text-sm font-semibold capitalize">
            {evaluation.status}
          </p>
        </div>
      </div>
    </div>
  </div>

  <div className="animate-up-delay rounded-[30px] border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-sm sm:p-6">
    <div className="grid h-full gap-5 lg:grid-cols-[260px_1fr] lg:items-center">
      <div className="flex flex-col items-center justify-center text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Practicum Grade
        </p>

        <div className="relative mt-5 flex h-40 w-40 items-center justify-center rounded-full border border-primary/30 bg-background/70 shadow-lg shadow-primary/10">
          <div className="absolute inset-2 animate-pulse rounded-full bg-primary/10 blur-xl" />
          <p className="relative text-6xl font-black tracking-tight text-primary">
            {practicumGrade ?? "-"}
          </p>
        </div>

        <h2 className="mt-5 text-2xl font-bold">
          {scoreLabel(overallScore)}
        </h2>

        <div className="mt-3 flex gap-1 text-amber-400">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`h-5 w-5 ${
                index < Math.round(overallScore)
                  ? "fill-current"
                  : "opacity-25"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background/70 p-5">
          <p className="text-xs text-muted-foreground">Overall Score</p>
          <p className="mt-2 text-3xl font-bold">{overallScore}/5</p>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-5">
          <p className="text-xs text-muted-foreground">Recommendation</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            {recommendationLabel(evaluation.recommendation)}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-5 sm:col-span-2">
          <p className="text-xs text-muted-foreground">Summary</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            You received a{" "}
            <span className="font-semibold text-foreground">
              {practicumGrade ?? "-"}
            </span>{" "}
            practicum grade with an overall rating of{" "}
            <span className="font-semibold text-foreground">
              {overallScore}/5
            </span>
            . Your evaluation is marked as{" "}
            <span className="font-semibold capitalize text-foreground">
              {evaluation.status}
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

          <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
            <div className="animate-up-late rounded-[30px] border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Performance Breakdown
                  </p>
                  <h2 className="text-xl font-bold">Score Categories</h2>
                </div>

                <div className="w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  {overallScore}/5
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ScoreItem
                  label="Attendance"
                  value={evaluation.attendance_score}
                />
                <ScoreItem
                  label="Work Quality"
                  value={evaluation.work_quality_score}
                />
                <ScoreItem
                  label="Professionalism"
                  value={evaluation.professionalism_score}
                />
                <ScoreItem
                  label="Communication"
                  value={evaluation.communication_score}
                />
                <div className="sm:col-span-2">
                  <ScoreItem
                    label="Initiative"
                    value={evaluation.initiative_score}
                  />
                </div>
              </div>
            </div>

            <div className="animate-up-late rounded-[30px] border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Award className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Result Summary
                  </p>
                  <h3 className="mt-1 text-xl font-bold">
                    {scoreLabel(overallScore)} Performance
                  </h3>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm leading-7 text-primary">
                <Sparkles className="mr-2 inline h-4 w-4" />
                {scoreLabel(overallScore)} overall performance based on your OJT
                evaluation.
              </div>
            </div>
          </section>

          <section className="animate-up-final grid gap-5 xl:grid-cols-[1fr_1.1fr]">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-3 text-emerald-400">
                  <div className="rounded-xl bg-emerald-500/10 p-2">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold">Strengths</h3>
                </div>

                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {evaluation.strengths || "No strengths were provided."}
                </p>
              </div>

              <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-3 text-amber-400">
                  <div className="rounded-xl bg-amber-500/10 p-2">
                    <Target className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold">Areas to Improve</h3>
                </div>

                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {evaluation.improvement_areas ||
                    "No improvement areas were provided."}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <MessageSquareText className="h-5 w-5" />
                </div>

                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Evaluator Feedback
                  </p>
                  <h3 className="mt-1 text-xl font-bold">General Comment</h3>

                  <div className="mt-4 rounded-2xl border border-border bg-background/70 p-4">
                    <p className="text-sm leading-7 text-muted-foreground">
                      {evaluation.general_comment ||
                        "No general comment was provided."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        @keyframes softUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-up {
          animation: softUp 420ms ease both;
        }

        .animate-up-delay {
          animation: softUp 480ms ease 80ms both;
        }

        .animate-up-late {
          animation: softUp 520ms ease 140ms both;
        }

        .animate-up-final {
          animation: softUp 560ms ease 190ms both;
        }
      `}</style>
    </div>
  );
}