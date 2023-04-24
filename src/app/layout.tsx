import "./globals.css";

import { Inter as FontSans, Tourney } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import { PropsWithChildren } from "react";
import { LogoIcon } from "~/components/icons";
import { MainNav } from "~/components/main-nav/main-nav";
import { MobileNav } from "~/components/mobile-nav";
import { ThemeProvider } from "~/components/theme-provider";
import { cn } from "~/components/ui/lib/utils";
import { rsc } from "~/shared/server-rsc/trpc";
import { ClientProvider } from "~/trpc/client/trpc-client";
import { MainDropdownMenu } from "./main-dropdown-menu";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontTourney = Tourney({
  subsets: ["latin"],
  variable: "--tourney",
  display: "swap",
});

export const metadata = {
  title: {
    default: "Portalsend",
    template: "%s | Portalsend",
  },
  description: "Dead simple end-to-end encrypted file sharing for everyone.",
};

export default async function RootLayout(props: PropsWithChildren) {
  const session = await rsc.example.getSession.fetch();

  const avatarFallbackText = (() => {
    const userName = session?.name;
    const firstLetterOfUsername = userName?.[0];
    return firstLetterOfUsername?.toUpperCase();
  })();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-white font-sans text-slate-900 antialiased dark:bg-[#012840] dark:text-slate-50",
          fontSans.variable,
          fontTourney.variable,
        )}
      >
        <ClientProvider>
          <ThemeProvider attribute="class" defaultTheme="dark">
            <div className="flex min-h-screen flex-col">
              <header className="sticky top-0 z-40 w-full border-b border-b-slate-200 bg-white dark:border-b-slate-700 dark:bg-[#012840]">
                <div className="container flex h-16 items-center">
                  <MainNav />
                  <MobileNav />
                  {/* Avatar */}
                  <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
                    <nav className="flex items-center space-x-2">
                      <>{!!session && <MainDropdownMenu avatarFallbackText={avatarFallbackText} user={session} />}</>
                    </nav>
                  </div>
                </div>
              </header>

              <main className="flex-1 items-center bg-gradient-to-b from-[#591240] to-[#012840] text-white">
                <div className="container mt-12 flex flex-col items-center justify-center">
                  <h1 className="text-6xl font-extrabold tracking-tight sm:text-[7rem]">
                    <span className="font-tourney font-semibold italic text-[#F27405]">Portalsend</span>
                  </h1>
                  {props.children}
                </div>

                <div className="h-4" />
              </main>

              <footer className="container">
                <div className="flex flex-col items-center justify-between gap-4 border-t border-t-slate-200 py-10 dark:border-t-slate-700 md:h-24 md:flex-row md:py-0">
                  <div className="flex flex-row items-center gap-4 px-8 md:px-0">
                    <LogoIcon className="h-6 w-6" />
                    <p className="flex gap-4 text-center text-sm leading-loose text-slate-600 dark:text-slate-400 md:text-left">
                      {session && (
                        <Link href="/profile" className="font-medium underline underline-offset-4">
                          Profile
                        </Link>
                      )}
                      <Link href="/privacy" className="font-medium underline underline-offset-4">
                        Privacy Policy
                      </Link>
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </ThemeProvider>
        </ClientProvider>
      </body>
      <Script
        async
        defer
        data-website-id="fc659f2e-2a70-462f-9e40-ddde89a878c6"
        data-domains="portalsend.app"
        src="https://umami-mattddean.vercel.app/umami.js"
      />
    </html>
  );
}
