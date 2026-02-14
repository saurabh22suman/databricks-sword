import { SignInButton } from "@/components/auth"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In | Databricks Sword",
  description: "Sign in to access missions, challenges, and track your progress",
}

export default function SignInPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 cyber-grid">
      <div className="grain-overlay" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl md:text-5xl text-anime-cyan mb-4 animate-float">
            Databricks Sword
          </h1>
          <p className="text-anime-700 text-lg">
            Master the Databricks ecosystem through gamified missions
          </p>
        </div>

        {/* Sign In Card */}
        <div className="bg-anime-900/80 border border-anime-700 p-8 cut-corner backdrop-blur-sm shadow-neon-cyan">
          <h2 className="font-heading text-2xl text-center mb-6">
            Sign In to Continue
          </h2>

          <SignInButton />

          {/* Info */}
          <div className="mt-6 p-4 bg-anime-800/50 border border-anime-700 cut-corner">
            <p className="text-xs text-anime-700 text-center">
              Sign in to unlock missions, track your progress, and earn achievements.
              Your data syncs across all devices.
            </p>
          </div>
        </div>

        {/* Public Access Notice */}
        <div className="mt-6 text-center">
          <p className="text-sm text-anime-700">
            Want to explore first?{" "}
            <a href="/blog" className="text-anime-cyan hover:text-anime-purple transition-colors">
              Read the blog
            </a>{" "}
            or check out the{" "}
            <a href="/intel" className="text-anime-cyan hover:text-anime-purple transition-colors">
              Intel
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
