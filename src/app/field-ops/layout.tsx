/**
 * Field Operations Layout
 * Provides breadcrumb navigation for all Field Ops pages.
 */

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    template: "%s | Field Operations | Databricks Sword",
    default: "Field Operations | Databricks Sword",
  },
  description: "Real-world Databricks deployments across 8 industries",
}

export default function FieldOpsLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="min-h-screen bg-anime-950 pt-20">
      {children}
    </div>
  )
}
