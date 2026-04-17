import {
  ClipboardList,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default async function TeacherDashboardPage() {
  // TODO: Replace with real data later
  const stats = [
    {
      label: "Assigned Students",
      value: 0,
      icon: Users,
    },
    {
      label: "Active Assignments",
      value: 0,
      icon: ClipboardList,
    },
    {
      label: "Completed Assignments",
      value: 0,
      icon: CheckCircle2,
    },
    {
      label: "Pending Reviews",
      value: 0,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Monitor your assigned students and internship progress.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
                <Icon className="h-5 w-5 text-muted-foreground/70" />
              </div>

              <div className="mt-3 text-2xl font-semibold text-foreground">
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder Section */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold text-foreground">
          Overview
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You will be able to view assigned students, their progress, and
          internship details here.
        </p>
      </div>
    </div>
  );
}