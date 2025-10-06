import { AuthButton } from "@/components/auth/auth-button";
import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CurrentUserAvatar } from "@/components/current-user-avatar";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <Nav />
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
