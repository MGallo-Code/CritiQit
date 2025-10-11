import { ThemeSwitcher } from "./auth/theme-switcher";

export function Footer() {
    return (
        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
            <p>
            This is a test footer...Change your theme here:
            </p>
            <ThemeSwitcher />
        </footer>
    );
  }
  