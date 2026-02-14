import type { Metadata } from "next"
import AdminPageClient from "./AdminPageClient"

export const metadata: Metadata = {
  title: "Admin Panel | Databricks Sword",
  description: "Manage blog posts and FAQ content",
  robots: { index: false, follow: false },
}

/**
 * Admin page for managing blog and FAQ content.
 * Protected by password authentication.
 */
export default function AdminPage(): React.ReactElement {
  return <AdminPageClient />
}
