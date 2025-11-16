"use client"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col gap-8 items-center w-full max-w-5xl mx-auto p-6">
      {children}
    </div>
  );
}
