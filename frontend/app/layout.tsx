import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CurrentUserProvider } from "@/providers/current-user-provider";
import { getCurrentUser } from "@/lib/auth/get-current-user";
const defaultUrl = `https://${process.env.VERCEL_URL}`;

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "CritiQit",
  description: "The ultimate rating platform",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user: currentUser } = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CurrentUserProvider initialUser={currentUser}>
            <div className="min-h-screen flex flex-col">
              <Nav />
              <main className="flex-1 flex flex-col">{children}</main>
              <Footer />
            </div>
          </CurrentUserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
