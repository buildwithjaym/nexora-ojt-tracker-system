"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.16),transparent_25%)]" />

      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              Trusted OJT tracking for institutions
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              Welcome back to
              <span className="bg-gradient-to-r from-primary via-blue-400 to-accent bg-clip-text text-transparent">
                {" "}
                Nexora
              </span>
            </h1>

            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Sign in to manage students, teachers, offices, assignments,
              batches, reports, and progress — all from one modern OJT platform.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                "Centralized OJT records",
                "Cleaner student monitoring",
                "Structured assignments",
                "School-ready reporting",
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
                Access your OJT dashboard with your school-issued credentials.
              </p>
            </div>

            <form className="space-y-5">
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
                    placeholder="Enter your email"
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
                    placeholder="Enter your password"
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-muted-foreground transition hover:text-foreground"
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
                className="w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95"
              >
                Sign In
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