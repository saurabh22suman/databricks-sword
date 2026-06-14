import { SandboxSyncProvider, SessionProvider } from "@/components/auth"
import { SkipToContent } from "@/components/a11y/SkipToContent"
import { BackgroundMusic } from "@/components/layout/BackgroundMusic"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { RouteChangeSound } from "@/components/layout/RouteChangeSound"
import { ToastContainer } from "@/components/gamification/ToastContainer"
import { XpFlyToBar } from "@/components/gamification/XpFlyToBar"
import { StreakFreezeNudge } from "@/components/gamification/StreakFreezeNudge"
import { StreakDailyBonus } from "@/components/gamification/StreakDailyBonus"
import { PromoBanner } from "@/components/ui/PromoBanner"
import { AutoCleanupRunner } from "@/components/field-ops/AutoCleanupRunner"
import { auth } from "@/lib/auth"
import { MOCK_SESSION, isMockAuth } from "@/lib/auth/mockSession"
import type { Metadata } from "next"
import { JetBrains_Mono, Saira } from "next/font/google"
import "./globals.css"

const saira = Saira({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_URL ?? "https://dbsword.com"
  ),
  title: {
    default: "Databricks Sword — Gamified Databricks Mastery",
    template: "%s | Databricks Sword",
  },
  description:
    "Master the Databricks ecosystem through gamified missions, interactive challenges, and spaced repetition. 22 story-driven missions, 52 challenges, dark cyberpunk theme. All simulated—no cloud costs.",
  keywords: [
    "Databricks",
    "Data Engineering",
    "PySpark",
    "Delta Lake",
    "MLflow",
    "Unity Catalog",
    "Structured Streaming",
    "Databricks Learning",
    "Gamified Learning",
    "Interactive Tutorial",
    "Lakehouse",
    "Data Science",
  ],
  openGraph: {
    title: "Databricks Sword — Gamified Databricks Mastery",
    description:
      "Master the Databricks ecosystem through gamified missions, interactive challenges, and spaced repetition.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Databricks Sword" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Databricks Sword — Gamified Databricks Mastery",
    description:
      "Master the Databricks ecosystem through gamified missions, interactive challenges, and spaced repetition.",
    images: ["/og-image.png"],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): Promise<React.ReactElement> {
  const session = isMockAuth ? MOCK_SESSION : await auth()

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${saira.variable} ${jetbrainsMono.variable} flex min-h-screen flex-col antialiased bg-anime-950 text-foreground`}
      >
        <SessionProvider session={session}>
          <SandboxSyncProvider>
            <SkipToContent />
            <Header />
            <RouteChangeSound />
            <BackgroundMusic />
            <ToastContainer />
            <XpFlyToBar />
            <StreakFreezeNudge />
            <StreakDailyBonus />
            <PromoBanner />
            <AutoCleanupRunner />
            <main id="main-content" tabIndex={-1} className="flex-1">
              {children}
            </main>
            <Footer />
          </SandboxSyncProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
