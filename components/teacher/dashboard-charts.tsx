"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartItem = {
  name: string;
  value: number;
};

type TeacherDashboardChartsProps = {
  assignmentStatusData: ChartItem[];
  progressDistributionData: ChartItem[];
  studentsByBatchData: ChartItem[];
};

const STATUS_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--foreground) / 0.75)",
  "hsl(var(--muted-foreground))",
];

const BATCH_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--foreground) / 0.75)",
  "hsl(var(--muted-foreground))",
  "hsl(var(--primary) / 0.65)",
  "hsl(var(--accent) / 0.75)",
];

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="h-[320px]">{children}</div>
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-background text-sm text-muted-foreground">
      No data available yet.
    </div>
  );
}

export function TeacherDashboardCharts({
  assignmentStatusData,
  progressDistributionData,
  studentsByBatchData,
}: TeacherDashboardChartsProps) {
  const hasAssignmentStatusData = assignmentStatusData.some((item) => item.value > 0);
  const hasProgressData = progressDistributionData.some((item) => item.value > 0);
  const hasBatchData = studentsByBatchData.some((item) => item.value > 0);

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <ChartCard
        title="Assignment Status Distribution"
        description="See how your assignments are distributed by status."
      >
        {hasAssignmentStatusData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "16px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Pie
                data={assignmentStatusData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={3}
              >
                {assignmentStatusData.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${index}`}
                    fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState />
        )}
      </ChartCard>

      <ChartCard
        title="Student Progress Distribution"
        description="Track how your assigned students are distributed by completion range."
      >
        {hasProgressData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressDistributionData}>
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "16px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar
                dataKey="value"
                radius={[12, 12, 0, 0]}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState />
        )}
      </ChartCard>

      <div className="xl:col-span-2">
        <ChartCard
          title="Students by Batch"
          description="View how your assigned students are grouped by academic batch."
        >
          {hasBatchData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={studentsByBatchData}
                layout="vertical"
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "16px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="value" radius={[0, 12, 12, 0]}>
                  {studentsByBatchData.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={BATCH_COLORS[index % BATCH_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState />
          )}
        </ChartCard>
      </div>
    </section>
  );
}