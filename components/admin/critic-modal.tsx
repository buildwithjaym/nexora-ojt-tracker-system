"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { Edit, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createCritic, updateCritic } from "@/app/admin/critics/actions";

type Office = {
  id: string;
  name: string;
  status: string | null;
};

type Critic = {
  id: string;
  office_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email: string;
  phone: string | null;
  position: string | null;
  status: string;
};

type CriticModalProps = {
  mode: "create" | "edit";
  offices: Office[];
  critic?: Critic;
};

export function CriticModal({ mode, offices, critic }: CriticModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const isEdit = mode === "edit";

  const title = isEdit ? "Edit Critic" : "Add Critic";
  const description = isEdit
    ? "Update critic information and office assignment."
    : "Create a critic account and assign the evaluator to an office.";

  const hasOffices = offices.length > 0;

  const triggerButton = useMemo(() => {
    if (!isEdit) {
      return (
        <button
          type="button"
          onClick={() => {
            setCredentials(null);
            setOpen(true);
          }}
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          Add Critic
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          setCredentials(null);
          setOpen(true);
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
        title="Edit critic"
      >
        <Edit className="h-4 w-4" />
      </button>
    );
  }, [isEdit]);

  function closeModal() {
    setOpen(false);
    setCredentials(null);
  }

  function validateClient(formData: FormData) {
    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const officeId = String(formData.get("office_id") ?? "").trim();

    if (!firstName || !lastName || !email || !officeId) {
      toast.error("Please fill in all required fields.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return false;
    }

    if (phone && !/^09\d{9}$/.test(phone)) {
      toast.error("Phone number must be 11 digits and start with 09.");
      return false;
    }

    return true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEdit && !critic?.id) {
      toast.error("Critic record is missing.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!validateClient(formData)) return;

    startTransition(async () => {
      const result = isEdit
        ? await updateCritic(critic!.id, formData)
        : await createCritic(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      if (!isEdit) {
        form.reset();

        if (result.credentials) {
          setCredentials(result.credentials);
        }

        return;
      }

      closeModal();
    });
  }

  return (
    <>
      {triggerButton}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background transition hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
              {credentials && (
                <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm">
                  <p className="font-semibold text-green-600">
                    Critic account created.
                  </p>
                  <p className="mt-1 text-foreground">
                    Email: <span className="font-semibold">{credentials.email}</span>
                  </p>
                  <p className="text-foreground">
                    Temporary Password:{" "}
                    <span className="font-semibold">{credentials.password}</span>
                  </p>
                </div>
              )}

              {!hasOffices && (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-600">
                  No offices found. Please add an office first before creating a critic.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="First Name" required>
                  <input
                    name="first_name"
                    required
                    defaultValue={critic?.first_name ?? ""}
                    className="input-style"
                  />
                </Field>

                <Field label="Middle Name">
                  <input
                    name="middle_name"
                    defaultValue={critic?.middle_name ?? ""}
                    className="input-style"
                  />
                </Field>

                <Field label="Last Name" required>
                  <input
                    name="last_name"
                    required
                    defaultValue={critic?.last_name ?? ""}
                    className="input-style"
                  />
                </Field>

                <Field label="Suffix">
                  <input
                    name="suffix"
                    defaultValue={critic?.suffix ?? ""}
                    className="input-style"
                  />
                </Field>

                <Field label="Email" required>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={critic?.email ?? ""}
                    placeholder="example@email.com"
                    className="input-style"
                  />
                </Field>

                <Field label="Phone Number">
                  <input
                    name="phone"
                    inputMode="numeric"
                    maxLength={11}
                    defaultValue={critic?.phone ?? ""}
                    placeholder="09XXXXXXXXX"
                    className="input-style"
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                    }}
                  />
                </Field>

                <Field label="Position">
                  <input
                    name="position"
                    defaultValue={critic?.position ?? ""}
                    placeholder="Office Supervisor"
                    className="input-style"
                  />
                </Field>

                <Field label="Office" required>
                  <select
                    name="office_id"
                    required
                    defaultValue={critic?.office_id ?? ""}
                    disabled={!hasOffices}
                    className="input-style disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Select office</option>
                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                        {office.status && office.status !== "active"
                          ? ` (${office.status})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    name="status"
                    defaultValue={critic?.status ?? "active"}
                    className="input-style"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-border bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending || !hasOffices}
                  className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending
                    ? isEdit
                      ? "Updating..."
                      : "Creating..."
                    : isEdit
                    ? "Update Critic"
                    : "Create Critic"}
                </button>
              </div>
            </form>
          </div>

          <style jsx>{`
            :global(.input-style) {
              height: 48px;
              width: 100%;
              border-radius: 1rem;
              border: 1px solid hsl(var(--border));
              background: hsl(var(--background));
              padding: 0 1rem;
              font-size: 0.875rem;
              outline: none;
              transition: border-color 0.2s ease;
            }

            :global(.input-style:focus) {
              border-color: hsl(var(--primary));
            }
          `}</style>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}