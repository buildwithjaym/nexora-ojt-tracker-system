import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plus,
  Search,
  SquarePen,
  Building2,
  Mail,
  MapPin,
  Phone,
  UserRound,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OfficeModal } from "@/components/admin/office-modal";
import { DeleteOfficeButton } from "@/components/admin/delete-office-button";
import { OfficeMapPreview } from "@/components/admin/office-map-preview";

type OfficesPageProps = {
  searchParams?: Promise<{
    search?: string;
    page?: string;
    modal?: string;
    edit?: string;
  }>;
};

const PAGE_SIZE = 10;

export default async function OfficesPage({
  searchParams,
}: OfficesPageProps) {
  const params = (await searchParams) ?? {};
  const search = params.search?.trim() ?? "";
  const currentPage = Math.max(Number(params.page ?? "1") || 1, 1);
  const modal = params.modal ?? "";
  const editId = params.edit ?? "";
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let countQuery = supabase
    .from("offices")
    .select("id", { count: "exact", head: true });

  let dataQuery = supabase
    .from("offices")
    .select(
      `
      id,
      name,
      address,
      contact_person,
      contact_email,
      contact_phone,
      capacity,
      status,
      latitude,
      longitude,
      map_label,
      created_at
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    const pattern = `%${search}%`;
    const filters = [
      `name.ilike.${pattern}`,
      `address.ilike.${pattern}`,
      `contact_person.ilike.${pattern}`,
      `contact_email.ilike.${pattern}`,
      `contact_phone.ilike.${pattern}`,
      `map_label.ilike.${pattern}`,
    ].join(",");

    countQuery = countQuery.or(filters);
    dataQuery = dataQuery.or(filters);
  }

  const [countRes, officesRes, editOfficeRes] = await Promise.all([
    countQuery,
    dataQuery,
    editId
      ? supabase
          .from("offices")
          .select(`
            id,
            name,
            address,
            contact_person,
            contact_email,
            contact_phone,
            capacity,
            status,
            latitude,
            longitude,
            map_label
          `)
          .eq("id", editId)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (officesRes.error) throw new Error(officesRes.error.message);
  if (editId && editOfficeRes.error) throw new Error(editOfficeRes.error.message);

  const offices = officesRes.data ?? [];
  const totalCount = countRes.count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  if (currentPage > totalPages && totalCount > 0) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(totalPages));
    redirect(`/admin/offices?${q.toString()}`);
  }

  function buildPageUrl(page: number) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(page));
    return `/admin/offices?${q.toString()}`;
  }

  function buildCreateModalUrl() {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(currentPage));
    q.set("modal", "create");
    return `/admin/offices?${q.toString()}`;
  }

  function buildEditModalUrl(officeId: string) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    q.set("page", String(currentPage));
    q.set("edit", officeId);
    return `/admin/offices?${q.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Office Management</p>
          <h1 className="text-2xl font-semibold tracking-tight">Offices</h1>
        </div>

        <Link
          href={buildCreateModalUrl()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Office
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form
            action="/admin/offices"
            method="get"
            className="flex w-full max-w-xl items-center gap-2"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by office, address, contact, or map label..."
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
                href="/admin/offices"
                className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-secondary"
              >
                Clear
              </Link>
            )}
          </form>

          <div className="text-sm text-muted-foreground">
            {totalCount} office{totalCount === 1 ? "" : "s"} found
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-4">
          {offices.map((office: any) => {
            const hasMap =
              office.latitude != null && office.longitude != null;

            const mapUrl = hasMap
              ? `https://www.google.com/maps?q=${office.latitude},${office.longitude}`
              : null;

            return (
              <div
                key={office.id}
                className="grid gap-4 rounded-2xl border border-border p-4 lg:grid-cols-[1.1fr_1fr_220px]"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Building2 className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">{office.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(office.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{office.address ?? "-"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 shrink-0" />
                      <span>{office.contact_person ?? "-"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span>{office.contact_email ?? "-"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{office.contact_phone ?? "-"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium capitalize">
                      {office.status}
                    </span>

                    <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium">
                      Capacity: {office.capacity ?? "-"}
                    </span>

                    {office.map_label && (
                      <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium">
                        {office.map_label}
                      </span>
                    )}
                  </div>
                </div>

                <OfficeMapPreview
                  latitude={office.latitude}
                  longitude={office.longitude}
                  label={office.map_label || office.name}
                />

                <div className="flex flex-col gap-2 lg:items-end">
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-secondary"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Map
                    </a>
                  )}

                  <Link
                    href={buildEditModalUrl(office.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-secondary"
                  >
                    <SquarePen className="h-4 w-4" />
                    Edit
                  </Link>

                  <DeleteOfficeButton
                    officeId={office.id}
                    officeName={office.name}
                  />
                </div>
              </div>
            );
          })}

          {offices.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No offices found.
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

      {modal === "create" && <OfficeModal mode="create" />}

      {editId && editOfficeRes.data && (
        <OfficeModal mode="edit" office={editOfficeRes.data} />
      )}
    </div>
  );
}