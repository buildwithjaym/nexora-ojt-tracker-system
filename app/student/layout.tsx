import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentLayoutShell } from "@/components/student/student-layout-shell";

type StudentLayoutProps = {
  children: ReactNode;
};

export default async function StudentLayout({
  children,
}: StudentLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.role !== "student" || !profile.is_active) {
    redirect("/login");
  }

  return <StudentLayoutShell>{children}</StudentLayoutShell>;
}