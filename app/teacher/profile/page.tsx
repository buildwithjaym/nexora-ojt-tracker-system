import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  BriefcaseBusiness,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { updateTeacherProfile } from "./actions";

type TeacherProfilePageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

function toDisplay(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

function ErrorMessage(error?: string) {
  switch (error) {
    case "session":
      return "Your session could not be verified. Please sign in again.";
    case "required":
      return "First name and last name are required.";
    case "name_length":
      return "First name or last name is too long.";
    case "middle_length":
      return "Middle name is too long.";
    case "suffix_length":
      return "Suffix is too long.";
    case "phone_length":
      return "Phone number is too long.";
    case "teacher_not_found":
      return "No matching teacher record was found for this account.";
    case "profile_update_failed":
      return "Unable to update your profile information.";
    case "teacher_update_failed":
      return "Unable to update your teacher contact information.";
    default:
      return "Something went wrong while updating your profile.";
  }
}

export default async function TeacherProfilePage({
  searchParams,
}: TeacherProfilePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const success = resolvedSearchParams.success === "1";
  const error = resolvedSearchParams.error;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // No-op in some server contexts
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6">
        <h1 className="text-lg font-semibold text-foreground">
          Unable to load profile
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your session could not be verified. Please sign in again.
        </p>
      </div>
    );
  }

  const [{ data: profile, error: profileError }, { data: teacher, error: teacherError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, email, first_name, middle_name, last_name, suffix, role, is_active"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("teachers")
        .select(
          "id, employee_number, first_name, middle_name, last_name, suffix, email, phone, department, status, profile_id"
        )
        .eq("profile_id", user.id)
        .maybeSingle(),
    ]);

  if (profileError || teacherError || !profile || !teacher) {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6">
        <h1 className="text-lg font-semibold text-foreground">
          Unable to load profile
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not find your teacher profile information.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="profile-fade rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Teacher Profile</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Manage Your Profile
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Update your personal information while keeping your
              institution-managed account details protected.
            </p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <UserCircle2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Role
              </p>
              <p className="text-sm font-semibold capitalize text-foreground">
                {profile.role}
              </p>
            </div>
          </div>
        </div>
      </section>

      {success && (
        <section className="profile-fade-delayed rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-medium text-emerald-400">
            Profile updated successfully.
          </p>
        </section>
      )}

      {error && (
        <section className="profile-fade-delayed rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">
            {ErrorMessage(error)}
          </p>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="profile-fade-delayed rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Personal Information
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You can update your basic personal details and contact number here.
            </p>
          </div>

          <form action={updateTeacherProfile} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-field">
                <label
                  htmlFor="first_name"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  First Name
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  defaultValue={profile.first_name ?? teacher.first_name ?? ""}
                  required
                  maxLength={100}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="Enter your first name"
                />
              </div>

              <div className="form-field">
                <label
                  htmlFor="middle_name"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Middle Name
                </label>
                <input
                  id="middle_name"
                  name="middle_name"
                  type="text"
                  defaultValue={
                    profile.middle_name ?? teacher.middle_name ?? ""
                  }
                  maxLength={100}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="Enter your middle name"
                />
              </div>

              <div className="form-field">
                <label
                  htmlFor="last_name"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Last Name
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  defaultValue={profile.last_name ?? teacher.last_name ?? ""}
                  required
                  maxLength={100}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="Enter your last name"
                />
              </div>

              <div className="form-field">
                <label
                  htmlFor="suffix"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Suffix
                </label>
                <input
                  id="suffix"
                  name="suffix"
                  type="text"
                  defaultValue={profile.suffix ?? teacher.suffix ?? ""}
                  maxLength={30}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="Jr., Sr., III"
                />
              </div>

              <div className="form-field sm:col-span-2">
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  defaultValue={teacher.phone ?? ""}
                  maxLength={30}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Only your personal information can be edited here.
              </p>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:translate-y-[-1px] hover:shadow-lg hover:shadow-primary/20 active:translate-y-0"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </form>
        </section>

        <section className="profile-fade-later space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Employment Information
                </h2>
                <p className="text-sm text-muted-foreground">
                  These fields are managed by the admin.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Employee Number
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {toDisplay(teacher.employee_number)}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Department
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {toDisplay(teacher.department)}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Status
                </p>
                <p className="mt-1 text-sm font-medium capitalize text-foreground">
                  {toDisplay(teacher.status)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Account Information
                </h2>
                <p className="text-sm text-muted-foreground">
                  Read-only account details for your login.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Email Address
                </p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">
                  {toDisplay(profile.email || teacher.email)}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Phone Number
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {toDisplay(teacher.phone)}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Admin-controlled fields
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Email, department, employee number, and account status are
                      managed by the admin to preserve role and institutional
                      consistency.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background px-4 py-3">
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Editable contact detail
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      You may update your phone number in the personal
                      information form.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .profile-fade {
          animation: fadeUp 0.45s ease-out forwards;
        }

        .profile-fade-delayed {
          animation: fadeUp 0.55s ease-out forwards;
        }

        .profile-fade-later {
          animation: fadeUp 0.65s ease-out forwards;
        }

        .form-field {
          animation: fieldIn 0.45s ease-out forwards;
        }

        .form-field:nth-child(1) { animation-delay: 40ms; }
        .form-field:nth-child(2) { animation-delay: 90ms; }
        .form-field:nth-child(3) { animation-delay: 140ms; }
        .form-field:nth-child(4) { animation-delay: 190ms; }
        .form-field:nth-child(5) { animation-delay: 240ms; }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fieldIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}