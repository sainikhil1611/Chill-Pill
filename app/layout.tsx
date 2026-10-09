import type { Metadata } from "next";
import { Geist, Geist_Mono, Fredoka, Nunito } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { GlobalAudioPlayer } from "@/components/GlobalAudioPlayer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chill-Pill",
  description: "A quiz-tuned focus soundtrack, generated for how your mind actually works.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} ${nunito.variable} antialiased`}
    >
      <body>
        <div className="relative min-h-screen overflow-hidden bg-clay text-ink">
          <div className="pointer-events-none absolute -right-24 -top-24 size-96 animate-floaty rounded-full bg-sky/40 blur-3xl" />
          <div className="pointer-events-none absolute -left-32 top-1/2 size-96 animate-floaty-slow rounded-full bg-coral/25 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 size-80 animate-floaty rounded-full bg-butter/40 blur-3xl" />
          <AppHeader />
          <GlobalAudioPlayer />
          {children}
        </div>
      </body>
    </html>
  );
}
