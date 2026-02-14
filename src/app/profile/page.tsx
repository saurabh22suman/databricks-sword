import type { Metadata } from "next"
import ProfilePageClient from "./ProfilePageClient"

export const metadata: Metadata = {
  title: "Profile | Databricks Sword",
  description: "Track your learning progress, achievements, XP rank, and streak calendar.",
}

/**
 * Profile Page (Server Component wrapper)
 * 
 * Provides metadata and delegates rendering to the client component
 * which loads real user data from the browser sandbox.
 */
export default function ProfilePage(): React.ReactElement {
  return <ProfilePageClient />
}