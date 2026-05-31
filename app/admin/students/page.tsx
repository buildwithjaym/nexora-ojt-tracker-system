import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Sparkles,
  SquarePen,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StudentModal } from "@/components/admin/student-modal";
import { DeleteStudentButton } from "@/components/admin/delete-student-button";

type StudentsPageProps = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

const PAGE_SIZE = 10;

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const params = await searchParams;
  const search = params.search?.trim() ?? "";

  const requestedPage = Number(params.page ?? "1");
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("students")
    .select(`*, batches:batch_id (*)`, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    const pattern = `%${search}%`;

    query = query.or(
      `first_name.ilike.${pattern},last_name.ilike.${pattern},student_number.ilike.${pattern},email.ilike.${pattern}`
    );
  }

  const [studentsRes, batchesRes] = await Promise.all([
    query,
    supabase.from("batches").select("*").eq("is_active", true).order("name"),
  ]);

  if (studentsRes.error) {
    throw new Error(studentsRes.error.message);
  }

  let editStudent = null;

  if (params.edit) {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("id", params.edit)
      .single();

    editStudent = data;
  }

  const students = studentsRes.data ?? [];
  const batches = batchesRes.data ?? [];
  const totalCount = studentsRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (totalCount > 0 && currentPage > totalPages) {
    const redirectParams = new URLSearchParams();

    if (search) {
      redirectParams.set("search", search);
    }

    redirectParams.set("page", String(totalPages));

    redirect(`/admin/students?${redirectParams.toString()}`);
  }

  const startItem = totalCount === 0 ? 0 : from + 1;
  const endItem = Math.min(to + 1, totalCount);

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  const getUrl = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      }
    });

    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    const queryString = current.toString();

    return queryString ? `/admin/students?${queryString}` : "/admin/students";
  };

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes adminFadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes adminGlow {
          0%, 100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.08);
          }
        }

        .admin-fade-up {
          animation: adminFadeUp 0.45s ease both;
        }

        .admin-row {
          animation: adminFadeUp 0.38s ease both;
        }

        .admin-glow {
          animation: adminGlow 3.5s ease-in-out infinite;
        }
      `}</style>

      <div className="admin-fade-up flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Student Management</p>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
        </div>

        <Link
          href={getUrl({ modal: "create" })}
          className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
        >
          <Plus size={16} className="transition group-hover:rotate-90" />
          Add Student
        </Link>
      </div>

      <div className="admin-fade-up relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
        <div className="admin-glow absolute right-6 top-3 h-16 w-16 rounded-full bg-primary/20 blur-2xl" />

        <form className="relative flex w-full flex-col gap-3 sm:max-w-2xl sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border bg-background px-3 py-2 transition focus-within:border-primary focus-within:shadow-sm">
            <Search size={16} className="text-muted-foreground" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search students..."
              className="h-8 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <button
            type="submit"
            className="rounded-2xl bg-secondary px-5 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-secondary/80 hover:shadow-sm"
          >
            Search
          </button>
        </form>
      </div>

      <div className="admin-fade-up overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Student Records
            </p>
            <p className="text-xs text-muted-foreground">
              Showing a maximum of {PAGE_SIZE} students per page.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Admin view
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Batch/Course</th>
                <th className="px-6 py-4">Hours</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {students.map((student, index) => (
                <tr
                  key={student.id}
                  className="admin-row group transition hover:bg-muted/30"
                  style={{ animationDelay: `${index * 35}ms` }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
                        <UserCheck className="h-5 w-5" />
                      </div>

                      <div>
                        <div className="font-medium text-foreground">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {student.student_number}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div>{student.batches?.name ?? "No batch"}</div>
                    <div className="text-xs text-muted-foreground">
                      {student.batches?.course ?? "No course"}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {student.completed_hours ?? 0} /{" "}
                    {student.required_hours ?? student.batches?.required_hours ?? 0}
                  </td>

                  <td className="px-6 py-4">
                    <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium capitalize">
                      {student.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={getUrl({ edit: student.id })}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border transition hover:-translate-y-0.5 hover:bg-secondary hover:shadow-sm"
                        aria-label="Edit student"
                      >
                        <SquarePen size={16} />
                      </Link>

                      <DeleteStudentButton
                        studentId={student.id}
                        studentName={`${student.first_name} ${student.last_name}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {students.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-14 text-center text-muted-foreground"
                  >
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">{startItem}</span>
            {" - "}
            <span className="font-semibold text-foreground">{endItem}</span>
            {" of "}
            <span className="font-semibold text-foreground">{totalCount}</span>
            {" students"}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex h-10 items-center justify-center rounded-2xl border bg-muted px-4 text-sm font-semibold text-foreground">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              {hasPreviousPage ? (
                <Link
                  href={getUrl({ page: String(currentPage - 1) })}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-sm sm:flex-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              ) : (
                <span className="inline-flex h-10 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold opacity-50 sm:flex-none">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </span>
              )}

              {hasNextPage ? (
                <Link
                  href={getUrl({ page: String(currentPage + 1) })}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-sm sm:flex-none"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex h-10 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold opacity-50 sm:flex-none">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {params.modal === "create" && (
        <StudentModal mode="create" batches={batches} />
      )}

      {params.edit && editStudent && (
        <StudentModal mode="edit" batches={batches} student={editStudent} />
      )}
    </div>
  );
}