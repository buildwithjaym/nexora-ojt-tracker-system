import { redirect } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CriticProfileForm } from "@/components/critic/critic-profile-form";

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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function resolveAvatarUrl(supabaseUrl: string, avatarUrl?: string | null) {
  if (!avatarUrl) return null;

  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }

  const cleanPath = avatarUrl.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/profile-avatars/${cleanPath}`;
}

export default async function CriticProfilePage() {
  const supabase = await createClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, avatar_url, role, is_active, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "critic" || !profile.is_active) {
    redirect("/login");
  }

  const { data: criticRaw, error } = await supabase
    .from("critics")
    .select(
      `
      id,
      first_name,
      middle_name,
      last_name,
      suffix,
      email,
      phone,
      position,
      status,
      created_at,
      offices:office_id (
        id,
        name,
        address,
        contact_person,
        contact_email,
        contact_phone,
        status
      )
    `
    )
    .eq("profile_id", user.id)
    .single();

  if (error || !criticRaw) redirect("/login");

  const office = normalizeRelation((criticRaw as any).offices);
  const name = fullName(criticRaw) || profile.full_name || "Critic Evaluator";
  const avatarUrl = resolveAvatarUrl(supabaseUrl, profile.avatar_url);
  const initials = getInitials(name);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Profile</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Critic Profile
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Keep your evaluator information updated and review your assigned
          practicum office.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl bg-primary/10 text-4xl font-bold text-primary ring-1 ring-primary/20">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials || <UserCircle className="h-12 w-12" />}</span>
              )}
            </div>

            <h3 className="mt-5 text-xl font-bold">{name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {criticRaw.position || "Critic Evaluator"}
            </p>

            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-semibold capitalize text-green-600">
              <ShieldCheck className="h-4 w-4" />
              {criticRaw.status}
            </span>
          </div>

          <div className="mt-6 space-y-3 border-t border-border pt-5">
            <InfoLine icon={<Mail className="h-4 w-4" />} value={criticRaw.email} />
            <InfoLine
              icon={<Phone className="h-4 w-4" />}
              value={criticRaw.phone || "No phone"}
            />
            <InfoLine
              icon={<BriefcaseBusiness className="h-4 w-4" />}
              value={criticRaw.position || "No position"}
            />
            <InfoLine
              icon={<Building2 className="h-4 w-4" />}
              value={(office as any)?.name || "No office"}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold">Editable Information</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your profile photo and keep your contact details updated.
            </p>

            <div className="mt-5">
              <CriticProfileForm
                phone={criticRaw.phone || ""}
                position={criticRaw.position || ""}
                avatarUrl={avatarUrl}
                criticName={name}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-5">
              <h3 className="text-lg font-semibold">Assigned Office</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Students assigned to this office will appear in your monitoring
                and evaluation pages.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Office Name" value={(office as any)?.name || "-"} />
              <Detail label="Status" value={(office as any)?.status || "-"} />
              <Detail
                label="Contact Person"
                value={(office as any)?.contact_person || "-"}
              />
              <Detail
                label="Contact Email"
                value={(office as any)?.contact_email || "-"}
              />
              <Detail
                label="Contact Phone"
                value={(office as any)?.contact_phone || "-"}
              />
              <Detail
                label="Address"
                value={(office as any)?.address || "-"}
                wide
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoLine({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      {icon}
      <span className="min-w-0 truncate">{value}</span>
    </div>
  );
}

function Detail({
  label,
  value,
  wide,
  icon,
}: {
  label: string;
  value: string;
  wide?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-background p-4 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}