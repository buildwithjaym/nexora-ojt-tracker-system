export default function CriticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* sidebar */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}