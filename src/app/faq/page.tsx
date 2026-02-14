import { redirect } from "next/navigation"

/**
 * Legacy FAQ route - redirects to /intel.
 * Kept for backwards compatibility with external links.
 */
export default function FAQRedirectPage(): never {
  redirect("/intel")
}
