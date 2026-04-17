import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plus,
  Search,
  SquarePen,
  CalendarDays,
  Building2,
  GraduationCap,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AssignmentModal } from "@/components/admin/assignment-modal";
import { DeleteAssignmentButton } from "@/components/admin/delete-assignment-button";

type AssignmentsPageProps = {
  searchParams?: Promise<{
    search?: string;
    page?: string;
    modal?: string;
    edit?: string;
  }>;
};

const PAGE_SIZE = 10;

function fullName(person: any) {
  return [
    person?.first_name,
    person?.middle_name,
    person?.last_name,
    person?.suffix,
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeBatchRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function AssignmentsPage({
  searchParams,
}: AssignmentsPageProps) {
  const params = (await searchParams) ?? {};
  const search = params.search?.trim() ?? "";
  const currentPage = Math.max(Number(params.page ?? "1") || 1, 1);
  const modal = params.modal ?? "";
  const editId = params.edit ?? "";
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  const [studentsRes, teachersRes, officesRes, existingAssignmentsRes] =
    await Promise.all([
      supabase
        .from("students")
        .select(`
          id,
          student_number,
          first_name,
          middle_name,
          last_name,
          suffix,
          completed_hours,
          required_hours,
          status,
          batches:batch_id (
            name,
            course
          )
        `)
        .eq("status", "active")
        .order("last_name", { ascending: true }),

      supabase
        .from("teachers")
        .select(`
          id,
          employee_number,
          first_name,
          middle_name,
          last_name,
          suffix,
          department,
          status
        `)
        .eq("status", "active")
        .order("last_name", { ascending: true }),

      supabase
        .from("offices")
        .select(`
          id,
          name,
          address,
          capacity,
          status
        `)
        .eq("status", "active")
        .order("name", { ascending: true }),

      supabase
        .from("assignments")
        .select(`
          id,
          student_id,
          teacher_id,
          office_id,
          status
        `),
    ]);

  if (studentsRes.error) throw new Error(studentsRes.error.message);
  if (teachersRes.error) throw new Error(teachersRes.error.message);
  if (officesRes.error) throw new Error(officesRes.error.message);
  if (existingAssignmentsRes.error) {
    throw new Error(existingAssignmentsRes.error.message);
  }

  const students =
    studentsRes.data?.map((student: any) => ({
      ...student,
      batches: normalizeBatchRelation(student.batches),
    })) ?? [];

  const teachers = teachersRes.data ?? [];
  const offices = officesRes.data ?? [];
  const existingAssignments = existingAssignmentsRes.data ?? [];

  let countQuery = supabase
    .from("assignments")
    .select("id", { count: "exact", head: true });

  let dataQuery = supabase
    .from("assignments")
    .select(
  `
  id,
  student_id,
  teacher_id,
  office_id,
  start_date,
  assigned_hours,
  status,
  remarks,
  created_at,
  students:student_id (
    id,
    first_name,
    middle_name,
    last_name,
    suffix,
    student_number,
    batches:batch_id (
      name,
      course
    )
  ),
  teachers:teacher_id (
    id,
    first_name,
    middle_name,
    last_name,
    suffix,
    department
  ),
  offices:office_id (
    id,
    name
  )
`,
  { count: "exact" }
)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    const pattern = `%${search}%`;

    const studentIds =
      students
        .filter((s: any) => {
          const haystack = [
            s.first_name,
            s.middle_name,
            s.last_name,
            s.student_number,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(search.toLowerCase());
        })
        .map((s: any) => s.id) ?? [];

    const teacherIds =
      teachers
        .filter((t: any) => {
          const haystack = [
            t.first_name,
            t.middle_name,
            t.last_name,
            t.employee_number,
            t.department,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(search.toLowerCase());
        })
        .map((t: any) => t.id) ?? [];

    const officeIds =
      offices
        .filter((o: any) => {
          const haystack = [o.name, o.address]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(search.toLowerCase());
        })
        .map((o: any) => o.id) ?? [];

    const ors = [
      `status.ilike.${pattern}`,
      ...studentIds.map((id: string) => `student_id.eq.${id}`),
      ...teacherIds.map((id: string) => `teacher_id.eq.${id}`),
      ...officeIds.map((id: string) => `office_id.eq.${id}`),
    ];

    if (ors.length > 0) {
      countQuery = countQuery.or(ors.join(","));
      dataQuery = dataQuery.or(ors.join(","));
    }
  }

  const [countRes, assignmentsRes, editAssignmentRes] = await Promise.all([
    countQuery,
    dataQuery,
    editId
      ? supabase
          .from("assignments")
          .select(`
            id,
            student_id,
            teacher_id,
            office_id,
            start_date,
            end_date,
            assigned_hours,
            status,
            remarks
          `)
          .eq("id", editId)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);
  if (editId && editAssignmentRes.error) {
    throw new Error(editAssignmentRes.error.message);
  }

  const assignments = assignmentsRes.data ?? [];
  const totalCount = countRes.count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  if (currentPage > totalPages && totalCount > 0) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(totalPages));
    redirect(`/admin/assignments?${q.toString()}`);
  }

  function buildPageUrl(page: number) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(page));
    return `/admin/assignments?${q.toString()}`;
  }

  function buildCreateModalUrl() {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(currentPage));
    q.set("modal", "create");
    return `/admin/assignments?${q.toString()}`;
  }

  function buildEditModalUrl(id: string) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(currentPage));
    q.set("edit", id);
    return `/admin/assignments?${q.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Assignment Management</p>
          <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
        </div>

        <Link
          href={buildCreateModalUrl()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Assignment
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form
            action="/admin/assignments"
            method="get"
            className="flex w-full max-w-xl items-center gap-2"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by student, teacher, office, or status..."
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <button
              type="submit"
              className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:bg-secondary"
            >
              Search
            </button>

            {search && (
              <Link
                href="/admin/assignments"
                className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:bg-secondary"
              >
                Clear
              </Link>
            )}
          </form>

          <div className="text-sm text-muted-foreground">
            {totalCount} assignment{totalCount === 1 ? "" : "s"} found
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-4">
          {assignments.map((assignment: any) => {
            const student = Array.isArray(assignment.students)
              ? assignment.students[0]
              : assignment.students;
            const teacher = Array.isArray(assignment.teachers)
              ? assignment.teachers[0]
              : assignment.teachers;
            const office = Array.isArray(assignment.offices)
              ? assignment.offices[0]
              : assignment.offices;

            const normalizedStudent = student
              ? {
                  ...student,
                  batches: normalizeBatchRelation(student.batches),
                }
              : null;

            return (
              <div
                key={assignment.id}
                className="grid gap-4 rounded-2xl border border-border p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md lg:grid-cols-[1.2fr_1fr_220px]"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary transition-transform duration-200 hover:scale-105">
                      <User className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        {normalizedStudent
                          ? fullName(normalizedStudent)
                          : "Unknown Student"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {normalizedStudent?.batches?.name ?? "-"} •{" "}
                        {normalizedStudent?.batches?.course ?? "-"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 shrink-0" />
                      <span>{teacher ? fullName(teacher) : "-"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span>{office?.name ?? "-"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span>
                        {assignment.start_date || "-"}
                      </span>
                    </div>
                  </div>

                  {assignment.remarks && (
                    <p className="text-xs text-muted-foreground">
                      {assignment.remarks}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-medium capitalize">
                      {assignment.status}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Assigned Hours
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      {assignment.assigned_hours ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
                  <Link
                    href={buildEditModalUrl(assignment.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:bg-secondary"
                  >
                    <SquarePen className="h-4 w-4" />
                    Edit
                  </Link>

                  <DeleteAssignmentButton
                    assignmentId={assignment.id}
                    label={
                      normalizedStudent
                        ? fullName(normalizedStudent)
                        : "this student"
                    }
                  />
                </div>
              </div>
            );
          })}

          {assignments.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No assignments found.
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={currentPage > 1 ? buildPageUrl(currentPage - 1) : "#"}
              aria-disabled={currentPage <= 1}
              className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                currentPage <= 1
                  ? "pointer-events-none border-border text-muted-foreground opacity-50"
                  : "border-border bg-background hover:bg-secondary"
              }`}
            >
              Previous
            </Link>

            <Link
              href={
                currentPage < totalPages ? buildPageUrl(currentPage + 1) : "#"
              }
              aria-disabled={currentPage >= totalPages}
              className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                currentPage >= totalPages
                  ? "pointer-events-none border-border text-muted-foreground opacity-50"
                  : "border-border bg-background hover:bg-secondary"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>

      {modal === "create" && (
        <AssignmentModal
          mode="create"
          students={students}
          teachers={teachers}
          offices={offices}
          existingAssignments={existingAssignments}
        />
      )}

      {editId && editAssignmentRes.data && (
        <AssignmentModal
          mode="edit"
          students={students}
          teachers={teachers}
          offices={offices}
          existingAssignments={existingAssignments}
          assignment={editAssignmentRes.data}
        />
      )}
    </div>
  );
}