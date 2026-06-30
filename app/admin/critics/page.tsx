import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CriticModal } from "@/components/admin/critic-modal";
import { DeleteCriticButton } from "@/components/admin/delete-critic-button";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 10;

export default async function AdminCriticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params?.q?.trim() ?? "";

  const requestedPage = Number(params?.page ?? "1");
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let criticsQuery = supabase
    .from("critics")
    .select(
      `
      id,
      profile_id,
      office_id,
      first_name,
      middle_name,
      last_name,
      suffix,
      email,
      phone,
      position,
      department,
      status,
      created_at,
      offices (
        id,
        name,
        status
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    criticsQuery = criticsQuery.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,position.ilike.%${q}%, department.ilike.%${q}%`
    );
  }

  const {
    data: critics,
    error: criticsError,
    count: criticsCount,
  } = await criticsQuery;

  const { data: offices, error: officesError } = await supabase
    .from("offices")
    .select("id, name, status")
    .order("name", { ascending: true });

  if (criticsError) {
    console.error("Critics fetch error:", criticsError.message);
  }

  if (officesError) {
    console.error("Offices fetch error:", officesError.message);
  }

  const totalCritics = criticsCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCritics / PAGE_SIZE));

  const startItem = totalCritics === 0 ? 0 : from + 1;
  const endItem = Math.min(to + 1, totalCritics);

  function buildPageHref(page: number) {
    const search = new URLSearchParams();

    if (q) {
      search.set("q", q);
    }

    search.set("page", String(page));

    return `/admin/critics?${search.toString()}`;
  }

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Critic Management
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Critics
          </h1>
        </div>

        <CriticModal mode="create" offices={offices ?? []} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <form className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search critics..."
              className="h-12 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-sm outline-none transition focus:border-primary"
            />
          </div>

          <button
            type="submit"
            className="h-12 rounded-2xl bg-muted px-6 text-sm font-semibold text-foreground transition hover:bg-muted/80"
          >
            Search
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr className="border-b border-border">
                <th className="px-7 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Critic
                </th>
                <th className="px-7 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Office
                </th>
                <th className="px-7 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Contact
                </th>
                <th className="px-7 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Position
                </th>
                <th className="px-7 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Department
                </th>
                <th className="px-7 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-7 py-4 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {(critics ?? []).map((critic: any) => {
                const fullName = [
                  critic.first_name,
                  critic.middle_name,
                  critic.last_name,
                  critic.suffix,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr
                    key={critic.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-7 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <UserCheck className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="font-semibold text-foreground">
                            {fullName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Critic Evaluator
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-7 py-5 font-medium text-foreground">
                      <div>
                        <p>{critic.offices?.name ?? "No office"}</p>
                        {critic.offices?.status && (
                          <p className="text-xs capitalize text-muted-foreground">
                            {critic.offices.status}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-7 py-5">
                      <p className="text-foreground">{critic.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {critic.phone ?? "No phone"}
                      </p>
                    </td>

                    <td className="px-7 py-5 text-muted-foreground">
                      {critic.position ?? "Not specified"}
                    </td>
                    <td className="px-7 py-5 text-muted-foreground">
                      {critic.department ?? "Not specified"}
                    </td>

                    <td className="px-7 py-5">
                      <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium capitalize">
                        {critic.status}
                      </span>
                    </td>

                    <td className="px-7 py-5">
                      <div className="flex justify-end gap-2">
                        <CriticModal
                          mode="edit"
                          offices={offices ?? []}
                          critic={critic}
                        />

                        <DeleteCriticButton criticId={critic.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {(!critics || critics.length === 0) && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-7 py-14 text-center text-muted-foreground"
                  >
                    No critics found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">{startItem}</span>
            {" - "}
            <span className="font-semibold text-foreground">{endItem}</span>
            {" of "}
            <span className="font-semibold text-foreground">{totalCritics}</span>
            {" critics"}
          </p>

          <div className="flex items-center gap-2">
            {hasPreviousPage ? (
              <Link
                href={buildPageHref(currentPage - 1)}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold transition hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            ) : (
              <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold opacity-50">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </span>
            )}

            <span className="inline-flex h-10 items-center rounded-2xl border border-border bg-muted px-4 text-sm font-semibold text-foreground">
              Page {currentPage} of {totalPages}
            </span>

            {hasNextPage ? (
              <Link
                href={buildPageHref(currentPage + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold transition hover:bg-muted"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold opacity-50">
                Next
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </div>

      {officesError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          Failed to load offices: {officesError.message}
        </div>
      )}
    </div>
  );
}