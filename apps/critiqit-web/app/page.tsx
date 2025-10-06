import { AuthButton } from "@/components/auth/auth-button";
import { Hero } from "@/components/hero";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { CurrentUserAvatar } from "@/components/current-user-avatar";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>CritiQit</Link>
            </div>
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <Hero />
          <main className="flex-1 flex flex-col gap-6 px-4">
            <h2 className="font-medium text-xl mb-4">Log in or Sign Up to get started!</h2>
            <AuthButton />
            <CurrentUserAvatar />
          </main>
        </div>

        <Footer />
      </div>
    </main>
  );
}
