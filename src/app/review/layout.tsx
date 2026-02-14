import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Review | Databricks Sword",
  description:
    "Review flashcards with spaced repetition to reinforce your Databricks knowledge. Track skill decay and optimize learning retention.",
}

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return <>{children}</>
}
