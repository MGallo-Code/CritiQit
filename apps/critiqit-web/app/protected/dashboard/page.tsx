import { redirect } from "next/navigation";
import { InfoIcon, ListChecks, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function DashboardPage() {
  const { user } = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const formattedCreatedAt = user.created_at
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(user.created_at))
    : "—";

  return (
    <div className="flex w-full flex-1 flex-col gap-10">
      <section className="rounded-xl border border-border/60 bg-card/60 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 text-left">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Welcome back, {user.username}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              This dashboard will showcase the feedback and ratings you collect
              across every critique session.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
            <InfoIcon className="h-3.5 w-3.5" />
            Preview
          </span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/40 bg-background/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Account email
            </p>
            <p className="mt-1 font-medium">{user.email ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Member since
            </p>
            <p className="mt-1 font-medium">{formattedCreatedAt}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <Star className="mb-4 h-12 w-12 text-primary" />
          <h2 className="text-xl font-semibold">Your rating timeline</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Keep an eye on this space. Once you start sharing projects, the
            ratings you gather will appear here with trends and highlights.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/60 p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <ListChecks className="h-4 w-4 text-primary" />
            Next steps
          </div>
          <p className="text-sm text-muted-foreground">
            We&apos;re building the tools that let you request critiques, track
            sentiment, and celebrate progress with your collaborators. Stay
            tuned—your insights will live here soon.
          </p>
        </div>
      </section>
    </div>
  );
}
