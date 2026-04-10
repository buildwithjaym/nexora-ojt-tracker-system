export default function AdminLoading() {
  return (
    <div className="space-y-5 sm:space-y-6 animate-pulse">
      <div className="rounded-[28px] border border-border bg-card p-4 sm:p-6 lg:p-7">
        <div className="h-6 w-40 rounded-full bg-muted" />
        <div className="mt-4 h-10 w-full max-w-[420px] rounded-xl bg-muted" />
        <div className="mt-3 h-4 w-full max-w-[620px] rounded bg-muted" />
        <div className="mt-2 h-4 w-full max-w-[540px] rounded bg-muted" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="h-12 w-12 rounded-2xl bg-muted" />
              <div className="h-6 w-14 rounded-full bg-muted" />
            </div>
            <div className="mt-4 h-4 w-20 rounded bg-muted" />
            <div className="mt-3 h-8 w-16 rounded bg-muted" />
            <div className="mt-2 h-4 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="h-8 w-20 rounded bg-muted" />
              </div>
              <div className="h-12 w-12 rounded-xl bg-muted" />
            </div>
            <div className="mt-4 h-4 w-40 rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="h-6 w-52 rounded bg-muted" />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="mb-2 flex justify-between">
                  <div className="h-6 w-28 rounded-full bg-muted" />
                  <div className="h-5 w-14 rounded bg-muted" />
                </div>
                <div className="h-3 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="mb-2 flex justify-between">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-4 w-20 rounded bg-muted" />
                </div>
                <div className="h-2.5 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}