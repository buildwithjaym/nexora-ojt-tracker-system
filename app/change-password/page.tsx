"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type ProfileRole = "admin" | "teacher" | "student" | "critic";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: ProfileRole;
  must_change_password: boolean | null;
  is_active: boolean;
};

function getRedirectPath(role: ProfileRole) {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    case "critic":
      return "/critic";
    default:
      return "/login";
  }
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      matches: password.length > 0 && password === confirmPassword,
    }),
    [password, confirmPassword]
  );

  const passedCount = Object.values(passwordChecks).filter(Boolean).length;

  const isPasswordValid =
    passwordChecks.minLength &&
    passwordChecks.hasUppercase &&
    passwordChecks.hasLowercase &&
    passwordChecks.hasNumber &&
    passwordChecks.matches;

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, must_change_password, is_active")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      const profileRow = data as ProfileRow;

      if (!profileRow.is_active) {
        toast.error("Your account is inactive.");
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!profileRow.must_change_password) {
        router.replace(getRedirectPath(profileRow.role));
        return;
      }

      setProfile(profileRow);
      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error("Please complete the password requirements.");
      return;
    }

    setSaving(true);

    try {
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });

      if (passwordError) {
        toast.error(passwordError.message);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", profile?.id);

      if (profileError) {
        toast.error(profileError.message);
        return;
      }

      toast.success("Password changed successfully.");
      router.replace(profile ? getRedirectPath(profile.role) : "/login");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-4">
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking account...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-background px-4 py-4 text-foreground sm:py-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.14),transparent_30%)]" />

      <section className="w-full max-w-[420px] rounded-[28px] border border-border bg-card/95 p-5 shadow-[0_20px_70px_-32px_hsl(var(--primary)/0.65)] backdrop-blur sm:p-7">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl border border-border bg-background p-2.5 shadow-sm sm:h-18 sm:w-18">
            <Image
              src="/Nexora.png"
              alt="Nexora logo"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Account Security
          </div>

          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Change Your Password
          </h1>

          <p className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm">
            Please replace your temporary password before continuing.
          </p>

          {profile?.full_name && (
            <p className="mt-3 truncate rounded-2xl border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground sm:text-xs">
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {profile.full_name}
              </span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="New Password"
            value={password}
            show={showPassword}
            disabled={saving}
            placeholder="Enter new password"
            onChange={setPassword}
            onToggle={() => setShowPassword((prev) => !prev)}
          />

          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            show={showConfirmPassword}
            disabled={saving}
            placeholder="Confirm new password"
            onChange={setConfirmPassword}
            onToggle={() => setShowConfirmPassword((prev) => !prev)}
          />

          <div className="rounded-2xl border border-border bg-background/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Password strength
              </p>
              <p className="text-xs text-muted-foreground">
                {passedCount}/5
              </p>
            </div>

            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${(passedCount / 5) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2">
              <Requirement passed={passwordChecks.minLength}>
                8 characters
              </Requirement>
              <Requirement passed={passwordChecks.hasUppercase}>
                Uppercase
              </Requirement>
              <Requirement passed={passwordChecks.hasLowercase}>
                Lowercase
              </Requirement>
              <Requirement passed={passwordChecks.hasNumber}>
                Number
              </Requirement>
              <Requirement
                passed={passwordChecks.matches}
                neutral={!confirmPassword}
              >
                Match
              </Requirement>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !isPasswordValid}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Save Password
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}

function PasswordField({
  label,
  value,
  show,
  disabled,
  placeholder,
  onChange,
  onToggle,
}: {
  label: string;
  value: string;
  show: boolean;
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>

      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="new-password"
          className="h-11 w-full rounded-2xl border border-input bg-background pl-10 pr-11 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          required
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Requirement({
  passed,
  neutral,
  children,
}: {
  passed: boolean;
  neutral?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      className={`flex items-center gap-1.5 ${
        neutral
          ? "text-muted-foreground/70"
          : passed
          ? "text-accent"
          : "text-muted-foreground/70"
      }`}
    >
      <CheckCircle2
        className={`h-3.5 w-3.5 ${
          neutral
            ? "opacity-35"
            : passed
            ? "opacity-100"
            : "opacity-35"
        }`}
      />
      {children}
    </p>
  );
}