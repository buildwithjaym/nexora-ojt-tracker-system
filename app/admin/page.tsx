import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ClipboardList,
  GraduationCap,
  Layers3,
  ShieldCheck,
  TrendingUp,
  Users,
  UserCheck,
  Clock3,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

function getStudentProgressStatus(progress: number) {
  if (progress >= 100) return "completed";
  if (progress >= 90) return "almost_complete";
  if (progress >= 60) return "on_track";
  return "needs_attention";
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-500/20 bg-emerald-500/15 text-emerald-400";
    case "almost_complete":
      return "border-lime-500/20 bg-lime-500/15 text-lime-400";
    case "on_track":
      return "border-blue-500/20 bg-blue-500/15 text-blue-400";
    case "needs_attention":
      return "border-amber-500/20 bg-amber-500/15 text-amber-400";
    case "active":
      return "border-emerald-500/20 bg-emerald-500/15 text-emerald-400";
    case "inactive":
      return "border-rose-500/20 bg-rose-500/15 text-rose-400";
    case "pending":
      return "border-amber-500/20 bg-amber-500/15 text-amber-400";
    case "approved":
      return "border-emerald-500/20 bg-emerald-500/15 text-emerald-400";
    case "rejected":
      return "border-rose-500/20 bg-rose-500/15 text-rose-400";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

function formatStatusLabel(status: string) {
  switch (status) {
    case "almost_complete":
      return "Almost Complete";
    case "needs_attention":
      return "Needs Attention";
    case "on_track":
      return "On Track";
    case "completed":
      return "Completed";
    default:
      return status
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function percentage(value: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function clampWidth(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    studentsCountRes,
    teachersCountRes,
    officesCountRes,
    batchesCountRes,
    assignmentsCountRes,
    studentsRes,
    teachersRes,
    officesRes,
    batchesRes,
    assignmentsRes,
    nearCompletionRes,
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("teachers").select("id", { count: "exact", head: true }),
    supabase.from("offices").select("id", { count: "exact", head: true }),
    supabase.from("batches").select("id", { count: "exact", head: true }),
    supabase.from("assignments").select("id", { count: "exact", head: true }),

    supabase
      .from("students")
      .select(
        `
        id,
        first_name,
        middle_name,
        last_name,
        suffix,
        status,
        required_hours,
        completed_hours,
        batch_id,
        batches:batch_id (
          id,
          name,
          course
        )
      `
      ),

    supabase.from("teachers").select("id, status"),
    supabase.from("offices").select("id, is_active"),
    supabase.from("batches").select("id, course, is_active"),

    supabase
      .from("assignments")
      .select(
        `
        id,
        status,
        created_at,
        students:student_id (
          id,
          first_name,
          last_name
        ),
        teachers:teacher_id (
          id,
          first_name,
          last_name
        ),
        offices:office_id (
          id,
          name
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(8),

    supabase
      .from("students")
      .select(
        `
        id,
        first_name,
        middle_name,
        last_name,
        suffix,
        status,
        required_hours,
        completed_hours,
        batches:batch_id (
          id,
          name,
          course
        )
      `
      )
      .order("completed_hours", { ascending: false })
      .limit(12),
  ]);

  const totalStudents = studentsCountRes.count ?? 0;
  const totalTeachers = teachersCountRes.count ?? 0;
  const totalOffices = officesCountRes.count ?? 0;
  const totalBatches = batchesCountRes.count ?? 0;
  const totalAssignments = assignmentsCountRes.count ?? 0;

  const students = studentsRes.data ?? [];
  const teachers = teachersRes.data ?? [];
  const offices = officesRes.data ?? [];
  const batches = batchesRes.data ?? [];
  const recentAssignments = assignmentsRes.data ?? [];
  const nearCompletionStudentsRaw = nearCompletionRes.data ?? [];

  const teacherActiveCount = teachers.filter(
    (teacher: any) => teacher.status === "active"
  ).length;

  const activeOfficesCount = offices.filter(
    (office: any) => office.is_active !== false
  ).length;

  const activeBatchesCount = batches.filter(
    (batch: any) => batch.is_active !== false
  ).length;

  const studentAnalytics = students.reduce(
    (acc: any, student: any) => {
      const requiredHours = Number(student.required_hours ?? 0);
      const completedHours = Number(student.completed_hours ?? 0);
      const progress =
        requiredHours > 0 ? Math.round((completedHours / requiredHours) * 100) : 0;

      const computedStatus = getStudentProgressStatus(progress);

      acc.totalRequiredHours += requiredHours;
      acc.totalCompletedHours += completedHours;

      acc.byProgressStatus[computedStatus] =
        (acc.byProgressStatus[computedStatus] ?? 0) + 1;

      const batch = Array.isArray(student.batches)
        ? student.batches[0]
        : student.batches;

      const course = batch?.course || "Unassigned";
      acc.byCourse[course] = (acc.byCourse[course] ?? 0) + 1;

      if (requiredHours > 0 && completedHours < requiredHours) {
        acc.studentsWithRemaining++;
      }

      if (student.status === "completed" || progress >= 100) {
        acc.completedStudents++;
      }

      return acc;
    },
    {
      totalRequiredHours: 0,
      totalCompletedHours: 0,
      studentsWithRemaining: 0,
      completedStudents: 0,
      byProgressStatus: {
        completed: 0,
        almost_complete: 0,
        on_track: 0,
        needs_attention: 0,
      },
      byCourse: {} as Record<string, number>,
    }
  );

  const overallCompletionRate = percentage(
    studentAnalytics.totalCompletedHours,
    studentAnalytics.totalRequiredHours
  );

  const completionRateByStudents = percentage(
    studentAnalytics.completedStudents,
    totalStudents
  );

  const pendingOrAttentionCount =
    studentAnalytics.byProgressStatus.needs_attention ?? 0;

  const nearCompletionStudents = nearCompletionStudentsRaw
    .map((student: any) => {
      const batch = Array.isArray(student.batches)
        ? student.batches[0]
        : student.batches;

      const fullName = [
        student.first_name,
        student.middle_name,
        student.last_name,
        student.suffix,
      ]
        .filter(Boolean)
        .join(" ");

      const requiredHours = Number(student.required_hours ?? 0);
      const completedHours = Number(student.completed_hours ?? 0);
      const progress =
        requiredHours > 0 ? Math.round((completedHours / requiredHours) * 100) : 0;
      const remaining = Math.max(requiredHours - completedHours, 0);
      const progressStatus = getStudentProgressStatus(progress);

      return {
        id: student.id,
        fullName,
        batchName: batch?.name ?? "-",
        course: batch?.course ?? "-",
        requiredHours,
        completedHours,
        progress,
        remaining,
        progressStatus,
      };
    })
    .filter((student) => student.progress < 100)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 8);

  const courseDistribution = Object.entries(
  studentAnalytics.byCourse as Record<string, number>
)
  .map(([course, count]) => ({
    course,
    count: Number(count),
    percent: percentage(Number(count), totalStudents),
  }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 6);

  const progressDistribution = [
    {
      label: "Completed",
      key: "completed",
      count: studentAnalytics.byProgressStatus.completed ?? 0,
    },
    {
      label: "Almost Complete",
      key: "almost_complete",
      count: studentAnalytics.byProgressStatus.almost_complete ?? 0,
    },
    {
      label: "On Track",
      key: "on_track",
      count: studentAnalytics.byProgressStatus.on_track ?? 0,
    },
    {
      label: "Needs Attention",
      key: "needs_attention",
      count: studentAnalytics.byProgressStatus.needs_attention ?? 0,
    },
  ].map((item) => ({
    ...item,
    percent: percentage(item.count, totalStudents),
  }));

  const assignmentStatusMap = recentAssignments.reduce(
    (acc: Record<string, number>, assignment: any) => {
      const key = assignment.status || "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const assignmentStatusSummary = Object.entries(assignmentStatusMap)
    .map(([status, count]) => ({
      status,
      count,
      percent: percentage(count, recentAssignments.length),
    }))
    .sort((a, b) => b.count - a.count);

  const topInsights = [
    {
      title: "Overall OJT Completion",
      value: `${overallCompletionRate}%`,
      note: `${studentAnalytics.totalCompletedHours.toLocaleString()} of ${studentAnalytics.totalRequiredHours.toLocaleString()} required hours completed`,
      icon: TrendingUp,
      accent:
        overallCompletionRate >= 80
          ? "text-emerald-400 bg-emerald-500/15 ring-emerald-500/20"
          : overallCompletionRate >= 60
          ? "text-blue-400 bg-blue-500/15 ring-blue-500/20"
          : "text-amber-400 bg-amber-500/15 ring-amber-500/20",
    },
    {
      title: "Students Completed",
      value: `${completionRateByStudents}%`,
      note: `${studentAnalytics.completedStudents} out of ${totalStudents} students finished`,
      icon: CheckCircle2,
      accent:
        completionRateByStudents >= 70
          ? "text-emerald-400 bg-emerald-500/15 ring-emerald-500/20"
          : "text-blue-400 bg-blue-500/15 ring-blue-500/20",
    },
    {
      title: "Need Attention",
      value: String(pendingOrAttentionCount),
      note: "Students below 60% progress",
      icon: AlertTriangle,
      accent:
        pendingOrAttentionCount > 0
          ? "text-amber-400 bg-amber-500/15 ring-amber-500/20"
          : "text-emerald-400 bg-emerald-500/15 ring-emerald-500/20",
    },
    {
      title: "Active Supervisors",
      value: `${teacherActiveCount}/${totalTeachers}`,
      note: "Teachers currently active",
      icon: UserCheck,
      accent: "text-violet-400 bg-violet-500/15 ring-violet-500/20",
    },
  ];

  const topStats = [
    {
      title: "Students",
      value: totalStudents,
      note: "Total student records",
      icon: Users,
      accent: "from-blue-500/15 to-cyan-500/10 text-blue-400 ring-blue-500/20",
    },
    {
      title: "Teachers",
      value: totalTeachers,
      note: `${teacherActiveCount} active supervisors`,
      icon: GraduationCap,
      accent:
        "from-emerald-500/15 to-lime-500/10 text-emerald-400 ring-emerald-500/20",
    },
    {
      title: "Offices",
      value: totalOffices,
      note: `${activeOfficesCount} active partner offices`,
      icon: Building2,
      accent:
        "from-orange-500/15 to-yellow-500/10 text-orange-400 ring-orange-500/20",
    },
    {
      title: "Batches",
      value: totalBatches,
      note: `${activeBatchesCount} active batches`,
      icon: Layers3,
      accent:
        "from-fuchsia-500/15 to-pink-500/10 text-fuchsia-400 ring-fuchsia-500/20",
    },
    {
      title: "Assignments",
      value: totalAssignments,
      note: "Placement and endorsement records",
      icon: ClipboardList,
      accent:
        "from-violet-500/15 to-indigo-500/10 text-violet-400 ring-violet-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Analytics Overview
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              Nexora OJT Operations Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Monitor OJT progress, student readiness, office activity, and recent
              assignments in one place. This dashboard is designed for faster
              decision-making and better administrative visibility.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[540px]">
            <Link
              href="/admin/students"
              className="rounded-2xl border border-border bg-background/70 p-4 transition hover:bg-secondary"
            >
              <p className="text-xs text-muted-foreground">Review</p>
              <p className="mt-1 font-medium">Students</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                Open module <ArrowRight className="h-3.5 w-3.5" />
              </p>
            </Link>

            <Link
              href="/admin/assignments"
              className="rounded-2xl border border-border bg-background/70 p-4 transition hover:bg-secondary"
            >
              <p className="text-xs text-muted-foreground">Manage</p>
              <p className="mt-1 font-medium">Assignments</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                Open module <ArrowRight className="h-3.5 w-3.5" />
              </p>
            </Link>

            <Link
              href="/admin/batches"
              className="rounded-2xl border border-border bg-background/70 p-4 transition hover:bg-secondary"
            >
              <p className="text-xs text-muted-foreground">Configure</p>
              <p className="mt-1 font-medium">Batches</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                Open module <ArrowRight className="h-3.5 w-3.5" />
              </p>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {topStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`rounded-2xl bg-gradient-to-br p-3 ring-1 ${stat.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Live
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{stat.title}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {topInsights.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.title}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">
                    {item.value}
                  </p>
                </div>

                <div className={`rounded-xl p-3 ring-1 ${item.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">{item.note}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Operational Progress Chart
              </p>
              <h3 className="text-lg font-semibold">Student Progress Distribution</h3>
            </div>

            <Link
              href="/admin/students"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              View Students
            </Link>
          </div>

          <div className="space-y-5">
            {progressDistribution.map((item) => (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                        item.key
                      )}`}
                    >
                      {item.label}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-medium">{item.count}</span>
                    <span className="ml-2 text-muted-foreground">
                      ({item.percent}%)
                    </span>
                  </div>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.key === "completed"
                        ? "bg-emerald-400"
                        : item.key === "almost_complete"
                        ? "bg-lime-400"
                        : item.key === "on_track"
                        ? "bg-blue-400"
                        : "bg-amber-400"
                    }`}
                    style={{ width: `${clampWidth(item.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Students with Remaining Hours</p>
              <p className="mt-2 text-xl font-semibold">
                {studentAnalytics.studentsWithRemaining}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Still actively completing OJT requirements
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Completion Rate by Students</p>
              <p className="mt-2 text-xl font-semibold">
                {completionRateByStudents}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Based on students who reached 100% progress
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-5">
            <p className="text-sm text-muted-foreground">Enrollment Analytics</p>
            <h3 className="text-lg font-semibold">Course Distribution</h3>
          </div>

          <div className="space-y-4">
            {courseDistribution.map((item) => (
              <div key={item.course} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.course}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.count} student{item.count === 1 ? "" : "s"} • {item.percent}%
                  </p>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${clampWidth(item.percent)}%` }}
                  />
                </div>
              </div>
            ))}

            {courseDistribution.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No course analytics available yet.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Batch Configuration</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-2xl font-bold">{activeBatchesCount}</p>
                <p className="text-xs text-muted-foreground">Active batches</p>
              </div>

              <div>
                <p className="text-2xl font-bold">{totalBatches}</p>
                <p className="text-xs text-muted-foreground">Total batches</p>
              </div>

              <div>
                <p className="text-2xl font-bold">{activeOfficesCount}</p>
                <p className="text-xs text-muted-foreground">Active offices</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Students Near Completion</p>
              <h3 className="text-lg font-semibold">Priority Monitoring List</h3>
            </div>

            <Link
              href="/admin/students"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-4 font-medium">Student</th>
                  <th className="pb-4 font-medium">Batch</th>
                  <th className="pb-4 font-medium">Course</th>
                  <th className="pb-4 font-medium">Progress</th>
                  <th className="pb-4 font-medium">Remaining</th>
                  <th className="pb-4 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {nearCompletionStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                          {getInitials(student.fullName || "Student")}
                        </div>

                        <div>
                          <p className="text-sm font-medium">{student.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.completedHours} / {student.requiredHours} hrs
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 text-sm text-muted-foreground">
                      {student.batchName}
                    </td>

                    <td className="py-4 text-sm text-muted-foreground">
                      {student.course}
                    </td>

                    <td className="py-4">
                      <div className="min-w-[180px]">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{student.progress}%</span>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full ${
                              student.progress >= 100
                                ? "bg-emerald-400"
                                : student.progress >= 90
                                ? "bg-lime-400"
                                : student.progress >= 60
                                ? "bg-blue-400"
                                : "bg-amber-400"
                            }`}
                            style={{ width: `${clampWidth(student.progress)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 text-sm font-medium text-foreground">
                      {student.remaining} hrs
                    </td>

                    <td className="py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                          student.progressStatus
                        )}`}
                      >
                        {formatStatusLabel(student.progressStatus)}
                      </span>
                    </td>
                  </tr>
                ))}

                {nearCompletionStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No student records found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Assignment Snapshot</p>
              <h3 className="text-lg font-semibold">Recent Assignment Status</h3>
            </div>

            <div className="space-y-3">
              {assignmentStatusSummary.map((item) => (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                        item.status
                      )}`}
                    >
                      {formatStatusLabel(item.status)}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {item.count} • {item.percent}%
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${
                        item.status === "approved" || item.status === "active"
                          ? "bg-emerald-400"
                          : item.status === "pending"
                          ? "bg-amber-400"
                          : item.status === "rejected" || item.status === "inactive"
                          ? "bg-rose-400"
                          : "bg-primary"
                      }`}
                      style={{ width: `${clampWidth(item.percent)}%` }}
                    />
                  </div>
                </div>
              ))}

              {assignmentStatusSummary.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No recent assignment analytics available.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Latest Activity</p>
              <h3 className="text-lg font-semibold">Recent Assignments</h3>
            </div>

            <div className="space-y-3">
              {recentAssignments.map((assignment: any) => {
                const student = Array.isArray(assignment.students)
                  ? assignment.students[0]
                  : assignment.students;

                const teacher = Array.isArray(assignment.teachers)
                  ? assignment.teachers[0]
                  : assignment.teachers;

                const office = Array.isArray(assignment.offices)
                  ? assignment.offices[0]
                  : assignment.offices;

                const studentName = [student?.first_name, student?.last_name]
                  .filter(Boolean)
                  .join(" ");

                const teacherName = [teacher?.first_name, teacher?.last_name]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    key={assignment.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {studentName || "Unknown Student"}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {office?.name ?? "No Office"}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                          assignment.status || "unknown"
                        )}`}
                      >
                        {formatStatusLabel(assignment.status || "unknown")}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Teacher: {teacherName || "-"}</span>
                      <span>•</span>
                      <span>
                        {new Date(assignment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}

              {recentAssignments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No assignment records found yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Admin Focus</p>
                <h3 className="text-lg font-semibold">What to Review Next</h3>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-300">
                {pendingOrAttentionCount > 0
                  ? `${pendingOrAttentionCount} student${pendingOrAttentionCount === 1 ? "" : "s"} need closer monitoring due to low progress.`
                  : "No students are currently flagged for low progress."}
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-300">
                {nearCompletionStudents.length > 0
                  ? `${nearCompletionStudents.length} student${nearCompletionStudents.length === 1 ? "" : "s"} are close to completion and may be ready for final evaluation soon.`
                  : "No students are currently close to final completion."}
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
                {activeOfficesCount} active office
                {activeOfficesCount === 1 ? "" : "s"} and {teacherActiveCount} active
                supervisor{teacherActiveCount === 1 ? "" : "s"} are available for OJT coordination.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}