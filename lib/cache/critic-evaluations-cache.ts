import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const getCriticEvaluationsData = unstable_cache(
  async (profileId: string) => {
    const supabase = await createClient();

    const { data: critic, error: criticError } = await supabase
      .from("critics")
      .select("id, office_id")
      .eq("profile_id", profileId)
      .eq("status", "active")
      .single();

    if (criticError || !critic) {
      throw new Error("Critic account not found.");
    }

    const { data: assignments, error } = await supabase
      .from("assignments")
      .select(`
        id,
        office_id,
        student_id,
        status,
        start_date,
        students:student_id (
          id,
          profile_id,
          student_number,
          first_name,
          middle_name,
          last_name,
          suffix,
          email,
          completed_hours,
          required_hours,
          profiles:profile_id (
            id,
            avatar_url
          ),
          batches:batch_id (
            name,
            course
          )
        ),
        evaluations (
          id,
          overall_score,
          recommendation,
          status,
          submitted_at
        )
      `)
      .eq("office_id", critic.office_id)
      .in("status", ["active", "completed"])
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return {
      critic,
      assignments: assignments ?? [],
    };
  },
  ["critic-evaluations-data"],
  {
    revalidate: 30,
    tags: ["critic-evaluations-data"],
  }
);