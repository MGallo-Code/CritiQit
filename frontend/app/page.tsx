'use client'

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Sparkles, Star, Users } from "lucide-react";
import { useCurrentUser } from "@/providers/current-user-provider";
import { Hero } from "@/components/hero";
import { Button } from "@/components/ui/button";

type FeatureHighlight = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const featureHighlights: FeatureHighlight[] = [
  {
    title: "Rate your favorite movies, TV shows, books, etc.",
    description: "Explore our unique rating system and see how your ratings compare to others.",
    icon: Star,
  },
  {
    title: "Share your ratings with friends and family.",
    description: "See what your friends and family think of your favorite movies, TV shows, books, etc.",
    icon: Users,
  },
  {
    title: "Get recommendations for your next movie, TV show, book, etc.",
    description: "Get recommendations for your next movie, TV show, book, etc.",
    icon: Sparkles,
  }
];

export default function Home() {
  // Get current user from provider
  const { user, isLoading } = useCurrentUser();

  return (
    <main className="flex flex-1 flex-col items-center">
      <div className="flex w-full max-w-5xl flex-col gap-16 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <Hero />

        <section className="grid gap-6 md:grid-cols-3">
          {/* Show feature highlights, as defined above... */}
          {featureHighlights.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="rounded-lg border border-border/60 bg-card/40 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-medium">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-border/60 bg-card/60 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-3 text-left">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Ready for your next critique session?
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Create an account or sign in to start publishing projects,
                inviting reviewers, and tracking every score in one place.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 text-center lg:items-end lg:text-right">
              {
                // If user is logged in, show the dashboard button
                user ? (
                  <Button asChild variant="secondary">
                    <Link
                      href="/protected/dashboard"
                      className="group inline-flex items-center gap-1"
                    >
                      View your dashboard
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                ) : (
                  // If user is not logged in OR is loading, show the login/signup buttons
                  <div className="flex justify-center gap-2">
                    <Button asChild size="sm" variant={"outline"}>
                      <Link href="/auth/login">Sign in</Link>
                    </Button>
                    <Button asChild size="sm" variant={"default"}>
                      <Link href="/auth/sign-up">Sign up</Link>
                    </Button>
                  </div>
                )
              }
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
