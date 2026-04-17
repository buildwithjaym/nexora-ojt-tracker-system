"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  User,
  Building2,
  GraduationCap,
  CalendarDays,
  Clock3,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  TimerReset,
  Hourglass,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAssignment,
  updateAssignment,
  type AssignmentActionResult,
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
    name: string;
    course: string;
  } | null;
};

type TeacherOption = {
  id: string;
  employee_number: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  department: string | null;
  status: string;
};

type OfficeOption = {
  id: string;
  name: string;
  address: string | null;
  capacity: number | null;
  status: string;
};

type AssignmentData = {
  id: string;
  student_id: string;
  teacher_id: string;
  office_id: string;
  start_date: string | null;
  assigned_hours: number | null;
  status: string;
  remarks: string | null;
};

type ExistingAssignmentOption = {
  id: string;
  student_id: string;
  teacher_id: string;
  office_id: string;
  status: string;
};

type AssignmentModalProps = {
  mode: "create" | "edit";
  students: StudentOption[];
  teachers: TeacherOption[];
  offices: OfficeOption[];
  existingAssignments?: ExistingAssignmentOption[];
  assignment?: AssignmentData | null;
};

function fullName(person: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
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

function statusBadgeClasses(status: string) {
  switch (status) {
    case "active":
      return "border-blue-500/20 bg-blue-500/15 text-blue-400";
    case "pending":
      return "border-yellow-500/20 bg-yellow-500/15 text-yellow-400";
    case "completed":
      return "border-emerald-500/20 bg-emerald-500/15 text-emerald-400";
    case "cancelled":
      return "border-rose-500/20 bg-rose-500/15 text-rose-400";
    default:
      return "border-border bg-secondary text-secondary-foreground";
  }
}

function isBlockingAssignmentStatus(status: string) {
  return status === "active" || status === "pending";
}

export function AssignmentModal({
  mode,
  students,
  teachers,
  offices,
  existingAssignments = [],
  assignment,
}: AssignmentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [studentId, setStudentId] = useState(assignment?.student_id ?? "");
  const [teacherId, setTeacherId] = useState(assignment?.teacher_id ?? "");
  const [officeId, setOfficeId] = useState(assignment?.office_id ?? "");
  const [selectedStatus, setSelectedStatus] = useState(
    assignment?.status ?? "active"
  );
  const [assignedHours, setAssignedHours] = useState<string>(
    assignment?.assigned_hours != null ? String(assignment.assigned_hours) : ""
  );
  const [hoursTouched, setHoursTouched] = useState(
    assignment?.assigned_hours != null
  );

  const selectedStudent = useMemo(
    () => students.find((item) => item.id === studentId),
    [students, studentId]
  );

  const selectedTeacher = useMemo(
    () => teachers.find((item) => item.id === teacherId),
    [teachers, teacherId]
  );

  const selectedOffice = useMemo(
    () => offices.find((item) => item.id === officeId),
    [offices, officeId]
  );

  const requiredHours = Number(selectedStudent?.required_hours ?? 0);
  const completedHours = Number(selectedStudent?.completed_hours ?? 0);
  const remainingHours = Math.max(requiredHours - completedHours, 0);
  const progressPercent =
    requiredHours > 0 ? Math.min((completedHours / requiredHours) * 100, 100) : 0;

  const blockingAssignmentsForStudent = useMemo(() => {
    return existingAssignments.filter((item) => {
      if (item.student_id !== studentId) return false;
      if (!isBlockingAssignmentStatus(item.status)) return false;
      if (mode === "edit" && item.id === assignment?.id) return false;
      return true;
    });
  }, [existingAssignments, studentId, mode, assignment?.id]);

  const teacherConflict = useMemo(() => {
    if (!studentId || !teacherId) return null;

    return blockingAssignmentsForStudent.find(
      (item) => item.teacher_id !== teacherId
    );
  }, [blockingAssignmentsForStudent, studentId, teacherId]);

  const officeConflict = useMemo(() => {
    if (!studentId || !officeId) return null;

    return blockingAssignmentsForStudent.find(
      (item) => item.office_id !== officeId
    );
  }, [blockingAssignmentsForStudent, studentId, officeId]);

  const duplicateTeacherOfficeAssignment = useMemo(() => {
    if (!studentId || !teacherId || !officeId) return null;

    return blockingAssignmentsForStudent.find(
      (item) => item.teacher_id === teacherId && item.office_id === officeId
    );
  }, [blockingAssignmentsForStudent, studentId, teacherId, officeId]);

  const selectedTeacherConflictName = useMemo(() => {
    if (!teacherConflict) return "";
    const conflictTeacher = teachers.find(
      (item) => item.id === teacherConflict.teacher_id
    );
    return conflictTeacher ? fullName(conflictTeacher) : "another teacher";
  }, [teacherConflict, teachers]);

  const selectedOfficeConflictName = useMemo(() => {
    if (!officeConflict) return "";
    const conflictOffice = offices.find(
      (item) => item.id === officeConflict.office_id
    );
    return conflictOffice?.name ?? "another office";
  }, [officeConflict, offices]);

  const validationError = useMemo(() => {
    if (teacherConflict) {
      return `This student already has a ${teacherConflict.status} assignment under ${selectedTeacherConflictName}.`;
    }

    if (officeConflict) {
      return `This student already has a ${officeConflict.status} assignment in ${selectedOfficeConflictName}.`;
    }

    if (duplicateTeacherOfficeAssignment) {
      return "This student already has an active or pending assignment with the selected teacher and office.";
    }

    if (selectedStudent && remainingHours <= 0) {
      return "This student has no remaining hours to assign.";
    }

    return "";
  }, [
    teacherConflict,
    officeConflict,
    duplicateTeacherOfficeAssignment,
    selectedStudent,
    remainingHours,
    selectedTeacherConflictName,
    selectedOfficeConflictName,
  ]);

  useEffect(() => {
    if (!selectedStudent) {
      if (!hoursTouched) {
        setAssignedHours("");
      }
      return;
    }

    if (!hoursTouched) {
      setAssignedHours(String(remainingHours));
    }
  }, [selectedStudent, remainingHours, hoursTouched]);

  function closeModal() {
    router.push("/admin/assignments");
  }

  function handleSuccess(result: AssignmentActionResult) {
    if (!result.success) {
      toast.error(result.message || "Something went wrong.");
      return;
    }

    toast.success(result.message);
    closeModal();
    router.refresh();
  }

  function handleSubmit(formData: FormData) {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const hoursValue = Number(formData.get("assigned_hours") || 0);

    if (!studentId || !teacherId || !officeId) {
      toast.error("Student, teacher, and office are required.");
      return;
    }

    if (!Number.isFinite(hoursValue) || hoursValue <= 0) {
      toast.error("Assigned hours must be greater than 0.");
      return;
    }

    if (selectedStudent && hoursValue > remainingHours) {
      toast.error(
        `Assigned hours cannot exceed remaining hours (${remainingHours}).`
      );
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAssignment(formData)
          : await updateAssignment(assignment?.id || "", formData);

      handleSuccess(result);
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={closeModal}
        aria-label="Close modal overlay"
      />

      <div className="relative z-10 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-sm text-muted-foreground">Assignment Management</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {mode === "create" ? "Create Assignment" : "Edit Assignment"}
            </h2>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card transition-all duration-200 hover:scale-[1.03] hover:bg-muted"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <form action={handleSubmit} className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
              <div className="space-y-4">
                {validationError && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Student *</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <select
                        name="student_id"
                        value={studentId}
                        onChange={(e) => {
                          setStudentId(e.target.value);
                          setHoursTouched(false);
                        }}
                        className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                        required
                      >
                        <option value="">Select student</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {fullName(student)} - {student.student_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Teacher *</label>
                    <div className="relative">
                      <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <select
                        name="teacher_id"
                        value={teacherId}
                        onChange={(e) => {
                          const nextTeacherId = e.target.value;
                          setTeacherId(nextTeacherId);

                          if (
                            nextTeacherId &&
                            studentId &&
                            blockingAssignmentsForStudent.some(
                              (item) => item.teacher_id !== nextTeacherId
                            )
                          ) {
                            const conflict = blockingAssignmentsForStudent.find(
                              (item) => item.teacher_id !== nextTeacherId
                            );
                            const conflictTeacher = teachers.find(
                              (item) => item.id === conflict?.teacher_id
                            );

                            toast.error(
                              `This student is already assigned to ${
                                conflictTeacher
                                  ? fullName(conflictTeacher)
                                  : "another teacher"
                              }.`
                            );
                          }
                        }}
                        className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
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
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Office *</label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <select
                        name="office_id"
                        value={officeId}
                        onChange={(e) => {
                          const nextOfficeId = e.target.value;
                          setOfficeId(nextOfficeId);

                          if (
                            nextOfficeId &&
                            studentId &&
                            blockingAssignmentsForStudent.some(
                              (item) => item.office_id !== nextOfficeId
                            )
                          ) {
                            const conflict = blockingAssignmentsForStudent.find(
                              (item) => item.office_id !== nextOfficeId
                            );
                            const conflictOffice = offices.find(
                              (item) => item.id === conflict?.office_id
                            );

                            toast.error(
                              `This student is already assigned to ${
                                conflictOffice?.name ?? "another office"
                              }.`
                            );
                          }
                        }}
                        className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                        required
                      >
                        <option value="">Select office</option>
                        {offices.map((office) => (
                          <option key={office.id} value={office.id}>
                            {office.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="date"
                          name="start_date"
                          defaultValue={assignment?.start_date ?? ""}
                          className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assigned Hours</label>
                      <div className="relative">
                        <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="number"
                          name="assigned_hours"
                          min={1}
                          max={remainingHours || undefined}
                          value={assignedHours}
                          onChange={(e) => {
                            setHoursTouched(true);
                            setAssignedHours(e.target.value);
                          }}
                          className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                          placeholder="Auto from student's remaining hours"
                        />
                      </div>
                      {selectedStudent && (
                        <p className="text-xs text-muted-foreground">
                          Auto-filled from remaining hours: {remainingHours}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <div className="relative">
                        <ClipboardCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <select
                          name="status"
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                        >
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Remarks</label>
                    <div className="relative">
                      <FileText className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <textarea
                        name="remarks"
                        rows={4}
                        defaultValue={assignment?.remarks ?? ""}
                        className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                        placeholder="Optional remarks..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-border bg-card/60 p-5 transition-all duration-200 hover:border-primary/25 hover:shadow-md">
                  <p className="text-sm font-medium">Assignment Summary</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Review selected details before saving.
                  </p>

                  <div className="mt-5 space-y-5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Student
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {selectedStudent ? fullName(selectedStudent) : "Not selected"}
                      </p>
                      {selectedStudent && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedStudent.batches?.name ?? "-"} •{" "}
                          {selectedStudent.batches?.course ?? "-"}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-blue-500/15 bg-blue-500/10 p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-400" />
                          <p className="text-xs font-medium text-blue-300">
                            Required
                          </p>
                        </div>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {requiredHours}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
                        <div className="flex items-center gap-2">
                          <TimerReset className="h-4 w-4 text-emerald-400" />
                          <p className="text-xs font-medium text-emerald-300">
                            Completed
                          </p>
                        </div>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {completedHours}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-yellow-500/15 bg-yellow-500/10 p-4">
                        <div className="flex items-center gap-2">
                          <Hourglass className="h-4 w-4 text-yellow-400" />
                          <p className="text-xs font-medium text-yellow-300">
                            Remaining
                          </p>
                        </div>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {remainingHours}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Teacher
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedTeacher ? fullName(selectedTeacher) : "Not selected"}
                      </p>
                      {selectedTeacher?.department && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedTeacher.department}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Office
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedOffice?.name ?? "Not selected"}
                      </p>
                      {selectedOffice?.address && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedOffice.address}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Status
                      </p>
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClasses(
                            selectedStatus
                          )}`}
                        >
                          {selectedStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-primary/15 bg-primary/5 p-5">
                  <p className="text-sm font-medium">Quick Tips</p>
                  <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                    <li>Assigned hours auto-fill from the student's remaining hours.</li>
                    <li>Conflicts are checked immediately when selecting teacher or office.</li>
                    <li>
                      A student cannot have another active or pending assignment in
                      a different teacher or office.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-5 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:bg-secondary"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending || !!validationError}
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? mode === "create"
                    ? "Creating..."
                    : "Updating..."
                  : mode === "create"
                  ? "Create Assignment"
                  : "Update Assignment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}