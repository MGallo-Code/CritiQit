export function Hero() {
  return (
    <section className="flex flex-col items-center text-center gap-6 py-12">
      <span className="rounded-full border border-border/40 bg-background px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
        Built for thoughtful feedback
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        CritiQit - A Unified Rating Platform
      </h1>
      <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
        CritiQit is built to help you rate your favorite movies, TV shows, books, etc. and share your ratings with friends and family.
      </p>
      <div className="h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </section>
  );
}
