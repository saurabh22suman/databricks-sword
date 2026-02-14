/**
 * @file layout.tsx
 * @description Layout wrapper for mission pages
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Missions | Databricks Sword",
  description: "Master the Databricks ecosystem through gamified missions",
};

interface MissionsLayoutProps {
  children: React.ReactNode;
}

/**
 * Missions layout component
 *
 * Provides shared wrapper for all mission-related pages.
 * Can include shared navigation, progress tracking, etc.
 */
export default function MissionsLayout({
  children,
}: MissionsLayoutProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-anime-950">
      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
