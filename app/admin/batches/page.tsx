// app/admin/batches/page.tsx

export default function BatchesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Assignments</h1>
      <p className="text-muted-foreground text-sm">
        Manage and track student OJT assignments here.
      </p>
      
      {/* Your assignment table or content goes here */}
      <div className="rounded-2xl border border-dashed p-20 flex items-center justify-center">
        <p className="text-muted-foreground">Assignment list coming soon...</p>
      </div>
    </div>
  );
}