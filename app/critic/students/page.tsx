"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Search,
  Clock,
  CheckCircle2,
  ClipboardCheck,
  UserCircle2,
} from "lucide-react";

/**
 * ROW TYPE
 */
type Row = {
  assignment_id: string;
  student_id: string;

  student_name: string;
  student_number: string;

  avatar_url: string | null;

  completed_hours: number;
  required_hours: number;

  evaluated: boolean;
};

/**
 * PAGE
 */
export default function CriticStudentsPage() {
  const supabase = createClient();

  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  /**
   * FETCH ASSIGNMENTS
   */
  const fetchData = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: critic } = await supabase
      .from("critics")
      .select("id, office_id")
      .eq("profile_id", user.id)
      .single();

    if (!critic) return;

    const { data: assignments } = await supabase
      .from("assignments")
      .select(`
        id,
        student_id,
        status,

        students:student_id (
          first_name,
          middle_name,
          last_name,
          student_number,
          completed_hours,
          required_hours,

          profiles:profile_id (
            avatar_url
          )
        ),

        evaluations (
          id,
          critic_id,
          assignment_id
        )
      `)
      .eq("office_id", critic.office_id)
      .in("status", ["pending", "active", "completed"]);

    const mapped: Row[] =
      assignments?.map((a: any) => {
        const s = Array.isArray(a.students)
          ? a.students[0]
          : a.students;

        const profile = Array.isArray(s?.profiles)
          ? s?.profiles[0]
          : s?.profiles;

        const evaluation =
          Array.isArray(a.evaluations)
            ? a.evaluations.find(
                (e: any) =>
                  e.critic_id === critic.id &&
                  e.assignment_id === a.id
              )
            : a.evaluations;

        const name =
          [
            s?.first_name,
            s?.middle_name,
            s?.last_name,
          ]
            .filter(Boolean)
            .join(" ") || "Unnamed Student";

        return {
          assignment_id: a.id,
          student_id: a.student_id,

          student_name: name,
          student_number: s?.student_number || "—",

          avatar_url: profile?.avatar_url ?? null,

          completed_hours: Number(
            s?.completed_hours ?? 0
          ),
          required_hours: Number(
            s?.required_hours ?? 0
          ),

          evaluated: !!evaluation,
        };
      }) ?? [];

    setRows(mapped);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /**
   * FILTER
   */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;

    return rows.filter(
      (r) =>
        r.student_name
          .toLowerCase()
          .includes(q) ||
        r.student_number
          .toLowerCase()
          .includes(q)
    );
  }, [rows, search]);

  /**
   * STATUS ENGINE
   */
  const grouped = useMemo(() => {
    const ongoing = filtered.filter(
      (r) => !r.evaluated && r.completed_hours < r.required_hours
    );

    const ready = filtered.filter(
      (r) => !r.evaluated && r.completed_hours >= r.required_hours
    );

    const submitted = filtered.filter(
      (r) => r.evaluated
    );

    return { ongoing, ready, submitted };
  }, [filtered]);

  return (
    <div className="space-y-6 p-4 lg:p-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">
          Student Evaluation Feed
        </h1>
        <p className="text-sm text-muted-foreground">
          Scroll through assigned students and evaluate when ready
        </p>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search student..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="space-y-10">
          <FeedSection
            title="Ongoing"
            color="yellow"
            icon={<Clock className="h-4 w-4" />}
            data={grouped.ongoing}
          />

          <FeedSection
            title="Ready for Evaluation"
            color="green"
            icon={<CheckCircle2 className="h-4 w-4" />}
            data={grouped.ready}
          />

          <FeedSection
            title="Submitted"
            color="blue"
            icon={<ClipboardCheck className="h-4 w-4" />}
            data={grouped.submitted}
          />
        </div>
      )}
    </div>
  );
}

/**
 * FEED SECTION
 */
function FeedSection({
  title,
  icon,
  data,
  color,
}: any) {
  const border =
    color === "yellow"
      ? "border-yellow-500"
      : color === "green"
      ? "border-green-500"
      : "border-blue-500";

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        {title}
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No students in this section.
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((s: Row) => (
            <Card
              key={s.assignment_id}
              className={`border-l-4 ${border} rounded-2xl`}
            >
              <CardContent className="p-5">
                {/* CENTER PROFILE LAYOUT (Facebook style) */}
                <div className="flex flex-col items-center text-center space-y-3">
                  {/* AVATAR CENTER */}
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {s.avatar_url ? (
                      <img
                        src={s.avatar_url}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserCircle2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* NAME */}
                  <div>
                    <p className="text-base font-semibold">
                      {s.student_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.student_number}
                    </p>
                  </div>

                  {/* PROGRESS */}
                  <div className="w-full max-w-xs">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.min(
                            (s.completed_hours /
                              s.required_hours) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {s.completed_hours} / {s.required_hours} hrs
                    </p>
                  </div>

                  {/* ACTION */}
                  <div className="pt-2">
                    {s.evaluated ? (
                      <span className="text-xs text-blue-600 font-medium">
                        Submitted
                      </span>
                    ) : s.completed_hours >=
                      s.required_hours ? (
                      <Button size="sm">
                        Evaluate
                      </Button>
                    ) : (
                      <span className="text-xs text-yellow-600">
                        Ongoing
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}