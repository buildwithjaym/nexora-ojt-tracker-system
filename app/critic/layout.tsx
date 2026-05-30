import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CriticSidebar } from "@/components/critic/critic-sidebar";
import { CriticNotificationButton } from "@/components/critic/critic-notification-button";

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

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function CriticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      role,
      is_active,
      first_name,
      middle_name,
      last_name,
      suffix
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "critic" ||
    profile.is_active !== true
  ) {
    redirect("/login");
  }

  const { data: criticRaw, error: criticError } = await supabase
    .from("critics")
    .select(`
      id,
      profile_id,
      office_id,
      first_name,
      middle_name,
      last_name,
      suffix,
      email,
      status,
      offices (
        id,
        name,
        status
      )
    `)
    .eq("profile_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (criticError || !criticRaw) redirect("/login");

  const criticOffice = normalizeRelation((criticRaw as any).offices);

  if (!criticOffice || criticOffice.status !== "active") {
    redirect("/login");
  }

  const criticName =
    fullName(criticRaw) || profile.full_name || "Critic Account";
  const officeName = criticOffice.name ?? "No office assigned";

  const { data: readyAssignments } = await supabase
    .from("assignments")
    .select(`
      id,
      office_id,
      status,
      students:student_id (
        id,
        first_name,
        middle_name,
        last_name,
        suffix,
        completed_hours,
        required_hours
      ),
      evaluations (
        id
      )
    `)
    .eq("office_id", criticRaw.office_id)
    .in("status", ["active", "completed"]);

  const notifications =
    readyAssignments
      ?.map((row: any) => {
        const student = normalizeRelation(row.students);
        const evaluation = normalizeRelation(row.evaluations);

        const completed = Number(student?.completed_hours ?? 0);
        const required = Number(student?.required_hours ?? 0);

        if (!student) return null;
        if (completed < required) return null;
        if (evaluation) return null;

        return {
          id: row.id,
          title: "Ready for evaluation",
          message: `${fullName(student)} has completed the required OJT hours and is waiting for your evaluation.`,
          href: "/critic/evaluations",
          unread: true,
        };
      })
      .filter(Boolean) ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <CriticSidebar criticName={criticName} officeName={officeName} />

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex min-h-[88px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <div className="pl-14 lg:pl-0">
              <p className="text-sm text-muted-foreground">Critic Portal</p>
              <h1 className="text-xl font-semibold tracking-tight">
                Nexora Evaluation
              </h1>
            </div>

            <div className="hidden w-full max-w-md items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 md:flex">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search students..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <CriticNotificationButton notifications={notifications as any[]} />
          </div>
        </header>

        <div className="px-5 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}