import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type AssignmentStatus = "pending" | "active" | "completed" | "cancelled";
type StudentStatus = "active" | "completed" | "inactive" | "dropped";

type BatchRow = {
  id: string;
  name: string;
  code: string;
  course: string;
} | null;

type StudentRow = {
  id: string;
  student_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  required_hours: number;
  completed_hours: number;
  status: StudentStatus;
  batch: BatchRow | BatchRow[] | null;
} | null;

type OfficeRow = {
  id: string;
  name: string;
  status: "active" | "inactive";
} | null;

type AssignmentRow = {
  id: string;
  status: AssignmentStatus;
  start_date: string | null;
  end_date: string | null;
  assigned_hours: number | null;
  remarks: string | null;
  created_at: string;
  student: StudentRow | StudentRow[] | null;
  office: OfficeRow | OfficeRow[] | null;
};

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatStudentName(params: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
}) {
  const firstName = params.first_name?.trim() ?? "";
  const lastName = params.last_name?.trim() ?? "";
  const middleInitial = params.middle_name?.trim()
    ? `${params.middle_name.trim().charAt(0)}.`
    : "";
  const suffix = params.suffix?.trim() ? ` ${params.suffix.trim()}` : "";

  return `${lastName}, ${firstName}${middleInitial ? ` ${middleInitial}` : ""}${suffix}`;
}

function getProgress(completed: number, required: number) {
  if (!required || required <= 0) return 0;
  return Math.max(0, Math.min(100, (completed / required) * 100));
}

function csvEscape(value: string | number | null | undefined) {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", session.user.id)
    .maybeSingle();

  if (teacherError || !teacher) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const status = (searchParams.get("status") || "all").trim().toLowerCase();

  const { data: assignmentsData, error } = await supabase
    .from("assignments")
    .select(
      `
        id,
        status,
        start_date,
        end_date,
        assigned_hours,
        remarks,
        created_at,
        student:students(
          id,
          student_number,
          first_name,
          middle_name,
          last_name,
          suffix,
          required_hours,
          completed_hours,
          status,
          batch:batches(
            id,
            name,
            code,
            course
          )
        ),
        office:offices(
          id,
          name,
          status
        )
      `
    )
    .eq("teacher_id", teacher.id);

  if (error) {
    return new NextResponse("Failed to export CSV.", { status: 500 });
  }

  const rows = ((assignmentsData ?? []) as AssignmentRow[])
    .map((item) => {
      const studentRaw = pickFirst(item.student);
      const officeRaw = pickFirst(item.office);
      const batchRaw = pickFirst(studentRaw?.batch ?? null);

      if (!studentRaw) return null;

      const row = {
        student_name: formatStudentName({
          first_name: studentRaw.first_name,
          middle_name: studentRaw.middle_name,
          last_name: studentRaw.last_name,
          suffix: studentRaw.suffix,
        }),
        student_number: studentRaw.student_number,
        batch_name: batchRaw?.name ?? "Unassigned Batch",
        office_name: officeRaw?.name ?? "Unknown Office",
        assignment_status: item.status,
        completed_hours: studentRaw.completed_hours,
        required_hours: studentRaw.required_hours,
        remaining_hours: Math.max(
          0,
          studentRaw.required_hours - studentRaw.completed_hours
        ),
        progress_percent: getProgress(
          studentRaw.completed_hours,
          studentRaw.required_hours
        ),
        start_date: item.start_date ?? "",
        end_date: item.end_date ?? "",
        assigned_hours: item.assigned_hours ?? "",
        remarks: item.remarks ?? "",
      };

      const matchesStatus =
        status === "all" ? true : row.assignment_status === status;

      const matchesQuery = !query
        ? true
        : [
            row.student_name,
            row.student_number,
            row.batch_name,
            row.office_name,
            row.remarks,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

      return matchesStatus && matchesQuery ? row : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if (b.completed_hours !== a.completed_hours) {
        return b.completed_hours - a.completed_hours;
      }

      if (b.progress_percent !== a.progress_percent) {
        return b.progress_percent - a.progress_percent;
      }

      return String(a.student_name).localeCompare(String(b.student_name));
    });

  const headers = [
    "Student Name",
    "Student Number",
    "Batch",
    "Office",
    "Assignment Status",
    "Completed Hours",
    "Required Hours",
    "Remaining Hours",
    "Progress Percent",
    "Start Date",
    "End Date",
    "Assigned Hours",
    "Remarks",
  ];

  const csvLines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row: any) =>
      [
        row.student_name,
        row.student_number,
        row.batch_name,
        row.office_name,
        row.assignment_status,
        row.completed_hours,
        row.required_hours,
        row.remaining_hours,
        row.progress_percent,
        row.start_date,
        row.end_date,
        row.assigned_hours,
        row.remarks,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  const csv = csvLines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="teacher-reports.csv"',
      "Cache-Control": "no-store",
    },
  });
}