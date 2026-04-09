import {
  ArrowUpRight,
  BarChart3,
  BookUser,
  Building2,
  ClipboardList,
  GraduationCap,
  Users,
} from "lucide-react";

const stats = [
  {
    title: "Total Students",
    value: "124",
    note: "+12 this month",
    icon: Users,
  },
  {
    title: "Total Teachers",
    value: "18",
    note: "Across assigned offices",
    icon: GraduationCap,
  },
  {
    title: "Active Offices",
    value: "12",
    note: "Available for assignment",
    icon: Building2,
  },
  {
    title: "Current Assignments",
    value: "106",
    note: "Students placed",
    icon: ClipboardList,
  },
];

const recentStudents = [
  {
    name: "Juan Dela Cruz",
    batch: "BSIT 2024",
    office: "Tech Solutions Inc.",
    teacher: "Maria Gonzales",
    hours: "120 / 250 hrs",
    status: "Active",
  },
  {
    name: "Maria Santos",
    batch: "BSA 2024",
    office: "Creative Office Hub",
    teacher: "John Smith",
    hours: "80 / 250 hrs",
    status: "Active",
  },
  {
    name: "Peter Reyes",
    batch: "BSCS 2024",
    office: "Innovate Corp.",
    teacher: "Maria Gonzales",
    hours: "200 / 250 hrs",
    status: "On Track",
  },
  {
    name: "Anna Garcia",
    batch: "BSIT 2024",
    office: "WebX Digital",
    teacher: "John Smith",
    hours: "250 / 250 hrs",
    status: "Completed",
  },
];

const activities = [
  "New student profile created",
  "Office assignment updated",
  "Teacher assigned to office",
  "Batch created successfully",
  "Student record updated",
];

function statusClasses(status: string) {
  switch (status) {
    case "Completed":
      return "bg-accent/15 text-accent border-accent/20";
    case "On Track":
      return "bg-primary/15 text-primary border-primary/20";
    default:
      return "bg-secondary text-secondary-foreground border-border";
  }
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[32px] border border-border bg-card p-6 shadow-lg shadow-black/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
                <BookUser className="h-3.5 w-3.5" />
                Centralized OJT control
              </div>

              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Welcome back, Admin.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                Manage students, teachers, offices, assignments, batches, and
                reports from one organized dashboard designed for daily school
                operations.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95">
                  Create Assignment
                </button>
                <button className="rounded-2xl border border-border bg-background px-5 py-3 text-sm font-semibold transition hover:bg-secondary">
                  View Reports
                </button>
              </div>
            </div>

            <div className="grid w-full max-w-sm grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">Batches</p>
                <p className="mt-2 text-2xl font-bold">6</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">Reports</p>
                <p className="mt-2 text-2xl font-bold">26</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">Need Review</p>
                <p className="mt-2 text-2xl font-bold">9</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="mt-2 text-2xl font-bold">38</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-card p-6 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Quick Overview</p>
              <h3 className="text-lg font-semibold">System Health</h3>
            </div>
            <div className="rounded-xl bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Stable
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {[
              { label: "Student records completed", value: "84%" },
              { label: "Office assignments configured", value: "91%" },
              { label: "Teacher coverage across offices", value: "76%" },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: item.value }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-[28px] border border-border bg-card p-5 shadow-lg shadow-black/10"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary ring-1 ring-primary/20">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1 text-xs text-accent">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Live
                </div>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">{stat.title}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{stat.note}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-border bg-card p-6 shadow-lg shadow-black/10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Latest Records</p>
              <h3 className="text-lg font-semibold">Recent Students</h3>
            </div>
            <button className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary">
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-4 font-medium">Student</th>
                  <th className="pb-4 font-medium">Batch</th>
                  <th className="pb-4 font-medium">Office</th>
                  <th className="pb-4 font-medium">Teacher</th>
                  <th className="pb-4 font-medium">Hours</th>
                  <th className="pb-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentStudents.map((student) => (
                  <tr key={student.name}>
                    <td className="py-4 text-sm font-medium">{student.name}</td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {student.batch}
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {student.office}
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {student.teacher}
                    </td>
                    <td className="py-4 text-sm text-muted-foreground">
                      {student.hours}
                    </td>
                    <td className="py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(
                          student.status
                        )}`}
                      >
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-border bg-card p-6 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Activity</p>
                <h3 className="text-lg font-semibold">System Updates</h3>
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-5 space-y-4">
              {activities.map((activity, index) => (
                <div key={activity} className="flex gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
                  <div>
                    <p className="text-sm">{activity}</p>
                    <p className="text-xs text-muted-foreground">
                      {index + 1} hour{index === 0 ? "" : "s"} ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-card p-6 shadow-lg shadow-black/10">
            <p className="text-sm text-muted-foreground">Admin Reminder</p>
            <h3 className="mt-2 text-lg font-semibold">
              Keep assignments and office records updated
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Clean office data and accurate adviser assignments make reporting,
              tracking, and student monitoring significantly easier.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}