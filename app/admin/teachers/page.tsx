import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, SquarePen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TeacherModal } from "@/components/admin/teacher-modal";
import { DeleteTeacherButton } from "@/components/admin/delete-teacher-button";

type TeachersPageProps = {
  searchParams?: Promise<{
    search?: string;
    page?: string;
    modal?: string;
    edit?: string;
  }>;
};

const PAGE_SIZE = 10;

export default async function TeachersPage({
  searchParams,
}: TeachersPageProps) {
  const params = (await searchParams) ?? {};
  const search = params.search?.trim() ?? "";
  const currentPage = Math.max(Number(params.page ?? "1") || 1, 1);
  const modal = params.modal ?? "";
  const editId = params.edit ?? "";
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let countQuery = supabase
    .from("teachers")
    .select("id", { count: "exact", head: true });

  let dataQuery = supabase
    .from("teachers")
    .select(
      `
      id,
      profile_id,
      employee_number,
      first_name,
      middle_name,
      last_name,
      suffix,
      email,
      phone,
      department,
      status,
      created_at
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    const pattern = `%${search}%`;
    const filters = [
      `first_name.ilike.${pattern}`,
      `middle_name.ilike.${pattern}`,
      `last_name.ilike.${pattern}`,
      `employee_number.ilike.${pattern}`,
      `email.ilike.${pattern}`,
      `department.ilike.${pattern}`,
    ].join(",");

    countQuery = countQuery.or(filters);
    dataQuery = dataQuery.or(filters);
  }

  const [countRes, teachersRes, editTeacherRes] = await Promise.all([
    countQuery,
    dataQuery,
    editId
      ? supabase
          .from("teachers")
          .select(`
            id,
            employee_number,
            first_name,
            middle_name,
            last_name,
            suffix,
            email,
            phone,
            department,
            status
          `)
          .eq("id", editId)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (teachersRes.error) {
    throw new Error(teachersRes.error.message);
  }

  if (editId && editTeacherRes.error) {
    throw new Error(editTeacherRes.error.message);
  }

  const teachers = teachersRes.data ?? [];
  const totalCount = countRes.count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  if (currentPage > totalPages && totalCount > 0) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(totalPages));
    redirect(`/admin/teachers?${q.toString()}`);
  }

  function buildPageUrl(page: number) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(page));
    return `/admin/teachers?${q.toString()}`;
  }

  function buildCreateModalUrl() {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(currentPage));
    q.set("modal", "create");
    return `/admin/teachers?${q.toString()}`;
  }

  function buildEditModalUrl(teacherId: string) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(currentPage));
    q.set("edit", teacherId);
    return `/admin/teachers?${q.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Teacher Management</p>
          <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
        </div>

        <Link
          href={buildCreateModalUrl()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Teacher
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form
            action="/admin/teachers"
            method="get"
            className="flex w-full max-w-xl items-center gap-2"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by name, employee number, email, or department..."
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <button
              type="submit"
              className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-secondary"
            >
              Search
            </button>

            {search && (
              <Link
                href="/admin/teachers"
                className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-secondary"
              >
                Clear
              </Link>
            )}
          </form>

          <div className="text-sm text-muted-foreground">
            {totalCount} teacher{totalCount === 1 ? "" : "s"} found
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-4 font-medium">Teacher</th>
                <th className="pb-4 font-medium">Employee No.</th>
                <th className="pb-4 font-medium">Department</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 font-medium">Contact</th>
                <th className="pb-4 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {teachers.map((teacher: any) => {
                const fullName = [
                  teacher.first_name,
                  teacher.middle_name,
                  teacher.last_name,
                  teacher.suffix,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr key={teacher.id}>
                    <td className="py-4">
                      <div>
                        <p className="text-sm font-medium">{fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(teacher.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 text-sm text-muted-foreground">
                      {teacher.employee_number}
                    </td>

                    <td className="py-4 text-sm text-muted-foreground">
                      {teacher.department ?? "-"}
                    </td>

                    <td className="py-4">
                      <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium capitalize text-foreground">
                        {teacher.status}
                      </span>
                    </td>

                    <td className="py-4 text-sm text-muted-foreground">
                      <div>{teacher.email ?? "-"}</div>
                      <div>{teacher.phone ?? "-"}</div>
                    </td>

                    <td className="py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={buildEditModalUrl(teacher.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-secondary"
                        >
                          <SquarePen className="h-4 w-4" />
                          Edit
                        </Link>

                        <DeleteTeacherButton
                          teacherId={teacher.id}
                          teacherName={fullName}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {teachers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No teachers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              href={currentPage < totalPages ? buildPageUrl(currentPage + 1) : "#"}
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

      {modal === "create" && <TeacherModal mode="create" />}

      {editId && editTeacherRes.data && (
        <TeacherModal mode="edit" teacher={editTeacherRes.data} />
      )}
    </div>
  );
}