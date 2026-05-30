"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  GraduationCap,
  Lock,
  User,
  UserCheck,
  X,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAssignment,
  updateAssignment,
} from "@/app/admin/assignments/actions";

type StudentOption = {
  id: string;
  student_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  completed_hours: number;
  required_hours: number;
  status: string;
  batches?: {
    name: string | null;
    course: string | null;
  } | null;
};

type TeacherOption = {
  id: string;
  employee_number?: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  department?: string | null;
  status: string;
};

type OfficeOption = {
  id: string;
  name: string;
  address?: string | null;
  capacity?: number | null;
  status: string;
};

type CriticOption = {
  id: string;
  office_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email: string | null;
  position: string | null;
  status: string;
};

type ExistingAssignmentOption = {
  id: string;
  student_id: string;
  teacher_id: string;
  office_id: string;
  status: string;
};

type AssignmentData = {
  id: string;
  student_id: string;
  teacher_id: string;
  office_id: string;
  start_date: string | null;
  end_date: string | null;
  assigned_hours: number | null;
  status: string;
  remarks: string | null;
};

type OfficeCapacityInfo = {
  used: number;
  capacity: number | null;
  isUnlimited: boolean;
  isFull: boolean;
  label: string;
};

type AssignmentModalProps = {
  mode: "create" | "edit";
  students: StudentOption[];
  teachers: TeacherOption[];
  offices: OfficeOption[];
  critics: CriticOption[];
  existingAssignments: ExistingAssignmentOption[];
  officeCapacityMap: Record<string, OfficeCapacityInfo>;
  assignment?: AssignmentData | null;
};

function fullName(person: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
}) {
  return [
    person.first_name,
    person.middle_name,
    person.last_name,
    person.suffix,
  ]
    .filter(Boolean)
    .join(" ");
}

function getOfficeCapacityTone(info?: OfficeCapacityInfo) {
  if (!info) return "border-border bg-background text-muted-foreground";
  if (info.isUnlimited) return "border-sky-500/20 bg-sky-500/10 text-sky-600";
  if (info.isFull) return "border-rose-500/20 bg-rose-500/10 text-rose-600";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600";
}

export function AssignmentModal({
  mode,
  students,
  teachers,
  offices,
  critics,
  existingAssignments,
  officeCapacityMap,
  assignment,
}: AssignmentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEdit = mode === "edit";

  const [studentId, setStudentId] = useState(assignment?.student_id ?? "");
  const [teacherId, setTeacherId] = useState(assignment?.teacher_id ?? "");
  const [officeId, setOfficeId] = useState(assignment?.office_id ?? "");
  const [status, setStatus] = useState(assignment?.status ?? "active");
  const [validationError, setValidationError] = useState("");

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) ?? null,
    [students, studentId]
  );

  const selectedOffice = useMemo(
    () => offices.find((office) => office.id === officeId) ?? null,
    [offices, officeId]
  );

  const selectedOfficeCapacity = officeId ? officeCapacityMap[officeId] : null;

  const selectedOfficeCritics = useMemo(
    () =>
      critics.filter(
        (critic) => critic.office_id === officeId && critic.status === "active"
      ),
    [critics, officeId]
  );

  const availableStudents = useMemo(() => {
    if (isEdit) return students;

    const unavailableIds = new Set(
      existingAssignments
        .filter((item) => ["pending", "active"].includes(item.status))
        .map((item) => item.student_id)
    );

    return students.filter((student) => !unavailableIds.has(student.id));
  }, [students, existingAssignments, isEdit]);

  function closeModal() {
    router.push("/admin/assignments");
    router.refresh();
  }

  function validateForm(formData: FormData) {
    const nextStudentId = String(formData.get("student_id") ?? "").trim();
    const nextTeacherId = String(formData.get("teacher_id") ?? "").trim();
    const nextOfficeId = String(formData.get("office_id") ?? "").trim();

    if (!nextTeacherId || !nextOfficeId) {
      return "Teacher and office are required.";
    }

    if (!isEdit && !nextStudentId) {
      return "Student is required.";
    }

    const nextStatus = String(formData.get("status") ?? status).trim();
    const nextOfficeCapacity = officeCapacityMap[nextOfficeId];
    const consumesCapacity = ["pending", "active"].includes(nextStatus);
    const isSameOffice = isEdit && assignment?.office_id === nextOfficeId;

    if (consumesCapacity && nextOfficeCapacity?.isFull && !isSameOffice) {
      return `${nextOfficeCapacity.label}. Please choose another office.`;
    }

    if (!isEdit) {
      const hasConflict = existingAssignments.some((item) => {
        return (
          item.student_id === nextStudentId &&
          ["pending", "active"].includes(item.status) &&
          ["pending", "active"].includes(status)
        );
      });

      if (hasConflict) {
        return "This student already has an active or pending assignment.";
      }
    }

    return "";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEdit && !assignment?.id) {
      toast.error("Assignment record is missing.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const error = validateForm(formData);

    setValidationError(error);

    if (error) {
      toast.error(error);
      return;
    }

    startTransition(async () => {
      const result =
        isEdit && assignment
          ? await updateAssignment(assignment.id, formData)
          : await createAssignment(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      closeModal();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isEdit ? "Edit Assignment" : "Add Assignment"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Student required hours are automatically loaded from the database.
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
          {validationError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Assignment conflict detected</p>
                  <p className="mt-1">{validationError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            <Field label="Student" required icon={<User className="h-4 w-4" />}>
              {isEdit ? (
                <>
                  <input type="hidden" name="student_id" value={studentId} />

                  <div className="flex h-12 w-full items-center gap-2 rounded-2xl border border-border bg-muted px-10 text-sm font-semibold text-foreground">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedStudent
                        ? `${fullName(selectedStudent)} - ${selectedStudent.student_number}`
                        : "Selected student"}
                    </span>
                  </div>
                </>
              ) : (
                <select
                  name="student_id"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  className="input-style pl-10"
                  required
                >
                  <option value="">Select student</option>
                  {availableStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {fullName(student)} - {student.student_number}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {selectedStudent && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Required Hours: {selectedStudent.required_hours} hours
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Read-only value from the student/batch database record.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Field
              label="Teacher"
              required
              icon={<GraduationCap className="h-4 w-4" />}
            >
              <select
                name="teacher_id"
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
                className="input-style pl-10"
                required
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {fullName(teacher)}
                    {teacher.department ? ` - ${teacher.department}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Office / Company"
              required
              icon={<Building2 className="h-4 w-4" />}
            >
              <select
                name="office_id"
                value={officeId}
                onChange={(event) => setOfficeId(event.target.value)}
                className="input-style pl-10"
                required
              >
                <option value="">Select office</option>
                {offices.map((office) => {
                  const capacityInfo = officeCapacityMap[office.id];
                  const isCurrentOffice = isEdit && assignment?.office_id === office.id;
                  const shouldDisable = capacityInfo?.isFull && !isCurrentOffice;

                  return (
                    <option
                      key={office.id}
                      value={office.id}
                      disabled={shouldDisable}
                    >
                      {capacityInfo?.label ?? office.name}
                    </option>
                  );
                })}
              </select>
            </Field>

            {officeId && selectedOfficeCapacity && (
              <div
                className={`rounded-2xl border p-4 ${getOfficeCapacityTone(
                  selectedOfficeCapacity
                )}`}
              >
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedOffice?.name ?? "Selected office"}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {selectedOfficeCapacity.isUnlimited
                        ? "Unlimited capacity"
                        : selectedOfficeCapacity.isFull
                        ? `Full (${selectedOfficeCapacity.used}/${selectedOfficeCapacity.capacity})`
                        : `${selectedOfficeCapacity.used}/${selectedOfficeCapacity.capacity} used`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pending and active assignments count against office capacity.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {officeId && (
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-start gap-3">
                  <UserCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Critic Assigned to This Office
                    </p>

                    {selectedOfficeCritics.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {selectedOfficeCritics.map((critic) => (
                          <p
                            key={critic.id}
                            className="text-sm text-muted-foreground"
                          >
                            {fullName(critic)}
                            {critic.position ? ` • ${critic.position}` : ""}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-amber-600">
                        No active critic is assigned to this office yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Field
              label="Start Date"
              icon={<CalendarDays className="h-4 w-4" />}
            >
              <input
                name="start_date"
                type="date"
                defaultValue={assignment?.start_date ?? ""}
                className="input-style pl-10"
              />
            </Field>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="input-style"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <textarea
                name="remarks"
                defaultValue={assignment?.remarks ?? ""}
                rows={4}
                placeholder="Optional notes about this assignment..."
                className="min-h-[110px] w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary"
              />
            </div>
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
              disabled={isPending}
              className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                ? "Update Assignment"
                : "Create Assignment"}
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
          background: hsl(var(--card));
          padding-right: 1rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        :global(.input-style:not(.pl-10)) {
          padding-left: 1rem;
        }

        :global(.input-style:focus) {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>

      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}