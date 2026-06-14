"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Download,
  Loader2,
  Star,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Evaluation = {
  id: string;
  student_id: string;
  critic_id: string;
  office_id: string;

  assertiveness: number;
  tact_ethics: number;
  courtesy_ethics: number;
  accepts_criticism: number;

  written_communication: number;
  oral_communication: number;
  active_listening: number;

  learning_ability: number;
  computer_knowledge: number;
  potential_growth: number;

  sound_judgment: number;
  theory_integration: number;

  output_quality: number;
  task_timeliness: number;

  attire: number;
  decorum: number;
  self_confidence: number;
  enthusiasm: number;

  average_rating: number;

  strengths: string | null;
  improvement_areas: string | null;
  general_comment: string | null;

  recommendation: string;
  status: string;
  submitted_at: string;
};

type Critic = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  position: string | null;
  profile_id: string;
};

type Profile = {
  id: string;
  avatar_url: string | null;
  full_name: string | null;
};

type Office = {
  name: string;
};

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fullName(c?: Critic | null) {
  if (!c) return "Unknown Critic";
  return [c.first_name, c.middle_name, c.last_name, c.suffix]
    .filter(Boolean)
    .join(" ");
}

export default function StudentEvaluationsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [critic, setCritic] = useState<Critic | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        setLoading(false);
        return;
      }

      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", auth.user.id)
        .single();

      if (!student) {
        setLoading(false);
        return;
      }

      const { data: evalData } = await supabase
        .from("evaluations")
        .select(`
          *,
          critics (
            first_name,
            middle_name,
            last_name,
            suffix,
            position,
            profile_id
          ),
          offices (
            name
          )
        `)
        .eq("student_id", student.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!evalData) {
        setLoading(false);
        return;
      }

      setEvaluation(evalData as Evaluation);
      setCritic((evalData as any).critics);
      setOffice((evalData as any).offices);

      if ((evalData as any).critics?.profile_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", (evalData as any).critics.profile_id)
          .maybeSingle();

        setProfile(prof);
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  const download = () => {
  toast.info("Download feature is coming soon.", {
    description: "We are currently finalizing the official PDF export system.",
  });
};
  return (
    <div className="min-h-screen bg-[#0b1220] px-6 py-6 text-white">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Student Evaluation</h1>
          <p className="text-xs text-white/50">
            Official OJT performance record
          </p>
        </div>

        {evaluation && (
          <button
            onClick={download}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-10 flex items-center gap-2 text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      )}

      {evaluation && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">

          {/* CRITIC CARD */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">

            <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/10">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-8 w-8 text-white/70" />
              )}
            </div>

            <h2 className="mt-3 text-sm font-semibold">
              {fullName(critic)}
            </h2>

            <p className="text-xs text-white/50">
              {critic?.position ?? "Critic"}
            </p>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/40">
              <BriefcaseBusiness className="h-4 w-4" />
              {office?.name ?? "Office"}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/40">
              <CalendarDays className="h-4 w-4" />
              Submitted: {formatDate(evaluation.submitted_at)}
            </div>

            {/* GRADE */}
            <div className="mt-6 rounded-2xl bg-blue-600 p-5 text-center">
              <p className="text-xs uppercase tracking-widest">Final Grade</p>

              <p className="mt-2 text-5xl font-bold">
                {evaluation.average_rating.toFixed(2)}
              </p>

              <div className="mt-3 flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(evaluation.average_rating)
                        ? "fill-white"
                        : "opacity-30"
                    }`}
                  />
                ))}
              </div>

              <p className="mt-2 text-xs text-white/80">
                {evaluation.recommendation}
              </p>
            </div>
          </div>

          {/* RIGHT SIDE CONTENT */}
          <div className="space-y-6">

            {/* SCORES GRID */}
            <div className="grid gap-3 sm:grid-cols-2">

              {[
                ["Assertiveness", evaluation.assertiveness],
                ["Tact Ethics", evaluation.tact_ethics],
                ["Courtesy", evaluation.courtesy_ethics],
                ["Accepts Criticism", evaluation.accepts_criticism],
                ["Written Comm", evaluation.written_communication],
                ["Oral Comm", evaluation.oral_communication],
                ["Active Listening", evaluation.active_listening],
                ["Learning Ability", evaluation.learning_ability],
                ["Computer Knowledge", evaluation.computer_knowledge],
                ["Potential Growth", evaluation.potential_growth],
                ["Sound Judgment", evaluation.sound_judgment],
                ["Theory Integration", evaluation.theory_integration],
                ["Output Quality", evaluation.output_quality],
                ["Task Timeliness", evaluation.task_timeliness],
                ["Attire", evaluation.attire],
                ["Decorum", evaluation.decorum],
                ["Self Confidence", evaluation.self_confidence],
                ["Enthusiasm", evaluation.enthusiasm],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-white/70">{label}</span>
                    <span className="text-blue-400">{value}/95</span>
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${(Number(value) / 95) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* FEEDBACK CARDS (FIXED MISSING DATA DISPLAY) */}
            <div className="grid gap-4 md:grid-cols-3">

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Strengths</p>
                <p className="mt-2 text-sm">
                  {evaluation.strengths ?? "No data"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Improvement Areas</p>
                <p className="mt-2 text-sm">
                  {evaluation.improvement_areas ?? "No data"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">General Comment</p>
                <p className="mt-2 text-sm">
                  {evaluation.general_comment ?? "No data"}
                </p>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}