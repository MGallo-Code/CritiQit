"use client"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center bg-curtain-folds">
      <div className="flex-1 w-full flex flex-col gap-8 items-center">
        <div className="flex-1 flex flex-col gap-8 max-w-5xl p-6">
          {children}
        </div>
      </div>
    </main>
  );
}
