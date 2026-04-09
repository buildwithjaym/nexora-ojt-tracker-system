"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfileRole = "admin" | "teacher" | "student";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange =
    (field: "email" | "password") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const getRedirectPath = (role: ProfileRole) => {
    switch (role) {
      case "admin":
        return "/admin";
      case "teacher":
        return "/teacher";
      case "student":
        return "/student";
      default:
        return "/";
    }
  };

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const email = form.email.trim();
    const password = form.password.trim();

    if (!email || !password) {
      toast.error("Missing credentials", {
        description: "Please enter both your email and password.",
      });
      return;
    }

    if (!email.includes("@")) {
      toast.error("Invalid email", {
        description: "Please enter a valid email address.",
      });
      return;
    }

    setIsSubmitting(true);

    const loadingToast = toast.loading("Signing you in...", {
      description: "Please wait while we verify your credentials.",
    });

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        toast.dismiss(loadingToast);
        toast.error("Login failed", {
          description:
            authError.message ||
            "Unable to sign in. Please check your email and password.",
        });
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        toast.dismiss(loadingToast);
        toast.error("Login failed", {
          description: "No authenticated user was returned.",
        });
        setIsSubmitting(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, is_active")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        toast.dismiss(loadingToast);
        toast.error("Profile not found", {
          description:
            "Your account was authenticated, but your profile could not be loaded.",
        });
        await supabase.auth.signOut();
        setIsSubmitting(false);
        return;
      }

      if (!profile.is_active) {
        toast.dismiss(loadingToast);
        toast.error("Account inactive", {
          description:
            "Your account is inactive. Please contact your administrator.",
        });
        await supabase.auth.signOut();
        setIsSubmitting(false);
        return;
      }

      const redirectTo = getRedirectPath(profile.role as ProfileRole);

      toast.dismiss(loadingToast);
      toast.success("Welcome back", {
        description: profile.full_name
          ? `Signed in successfully as ${profile.full_name}.`
          : "Signed in successfully.",
      });

      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      toast.dismiss(loadingToast);
      toast.error("Something went wrong", {
        description: "An unexpected error occurred while signing in.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.16),transparent_25%)]" />

      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 sm:px-6 lg:grid-cols-2">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              Secure access for institutions and practicum users
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              Welcome back to
              <span className="bg-gradient-to-r from-primary via-blue-400 to-accent bg-clip-text text-transparent">
                {" "}
                Nexora
              </span>
            </h1>

            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Sign in to access your OJT workspace and continue managing
              attendance, progress, assignments, and institutional monitoring
              with confidence.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                "Secure role-based access",
                "Cleaner attendance workflows",
                "Centralized practicum records",
                "Reliable monitoring experience",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <p className="text-sm font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-[32px] border border-white/10 bg-card/90 p-8 shadow-[0_20px_80px_-20px_rgba(37,99,235,0.35)] backdrop-blur">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="relative h-16 w-16 overflow-hidden rounded-3xl ring-1 ring-white/10">
                <Image
                  src="/logo.png"
                  alt="Nexora logo"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>

              <h2 className="mt-5 text-2xl font-bold tracking-tight">
                Sign in to Nexora
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Access your dashboard using your school-issued credentials.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={handleChange("email")}
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info("Password recovery", {
                        description:
                          "Forgot password flow will be added next.",
                      })
                    }
                    className="text-xs font-medium text-primary transition hover:opacity-80"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4">
                  <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange("password")}
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-muted-foreground transition hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Need help accessing your account?{" "}
                <Link href="/" className="font-medium text-primary">
                  Return to homepage
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}