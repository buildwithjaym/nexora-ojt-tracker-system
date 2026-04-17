import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, SquarePen } from "lucide-react";
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
  const currentPage = Math.max(Number(params.page) || 1, 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  // Optimized Query: Fetching everything in one go where possible
  let query = supabase
    .from("students")
    .select(`*, batches:batch_id (*)`, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},student_number.ilike.${pattern},email.ilike.${pattern}`);
  }

  // Parallel data fetching
  const [studentsRes, batchesRes] = await Promise.all([
    query,
    supabase.from("batches").select("*").eq("is_active", true).order("name"),
  ]);

  if (studentsRes.error) throw new Error(studentsRes.error.message);

  // Fetch student details only if in edit mode
  let editStudent = null;
  if (params.edit) {
    const { data } = await supabase.from("students").select("*").eq("id", params.edit).single();
    editStudent = data;
  }

  const students = studentsRes.data ?? [];
  const batches = batchesRes.data ?? [];
  const totalCount = studentsRes.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // Helper for URL building
  const getUrl = (newParams: Record<string, string | null>) => {
    const current = new URLSearchParams(params as Record<string, string>);
    Object.entries(newParams).forEach(([k, v]) => (v ? current.set(k, v) : current.delete(k)));
    return `/admin/students?${current.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Student Management</p>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
        </div>
        <Link 
          href={getUrl({ modal: "create" })} 
          className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
        >
          <Plus size={16} /> Add Student
        </Link>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <form className="flex w-full max-w-xl items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border bg-background px-3 py-2">
            <Search size={16} className="text-muted-foreground" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search students..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <button type="submit" className="rounded-2xl bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80">Search</button>
        </form>
      </div>

      {/* Students Table */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-muted-foreground font-medium uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Batch/Course</th>
                <th className="px-6 py-4">Hours</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-muted/30 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{student.first_name} {student.last_name}</div>
                    <div className="text-xs text-muted-foreground">{student.student_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>{student.batches?.name}</div>
                    <div className="text-xs text-muted-foreground">{student.batches?.course}</div>
                  </td>
                  <td className="px-6 py-4">
                    {student.completed_hours ?? 0} / {student.required_hours ?? student.batches?.required_hours}
                  </td>
                  <td className="px-6 py-4">
                    <span className="capitalize px-2 py-1 rounded-full border text-xs">{student.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Link href={getUrl({ edit: student.id })} className="p-2 border rounded-xl hover:bg-secondary transition"><SquarePen size={16}/></Link>
                    <DeleteStudentButton studentId={student.id} studentName={`${student.first_name} ${student.last_name}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {params.modal === "create" && <StudentModal mode="create" batches={batches} />}
      {params.edit && editStudent && <StudentModal mode="edit" batches={batches} student={editStudent} />}
    </div>
  );
}