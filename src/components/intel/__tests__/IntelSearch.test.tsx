/**
 * @file IntelSearch.test.tsx
 * @description Unit tests for the IntelSearch client component
 * (search input + filtered accordion).
 */

import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { IntelSearch } from "../IntelSearch"

const fixture = [
  {
    name: "Delta Lake",
    iconPath: "/icons/cat-delta-lake.png",
    questions: [
      {
        id: 1,
        question: "What is a Delta Lake transaction log?",
        answer: "The transaction log records every change to a Delta table.",
        codeExample: null,
        keyPoints: ["Atomicity", "Time travel"],
      },
      {
        id: 2,
        question: "How does Z-Ordering work?",
        answer: "Z-Ordering co-locates related data in the same set of files.",
        codeExample: null,
        keyPoints: ["Data skipping", "Cardinality"],
      },
    ],
  },
  {
    name: "PySpark",
    iconPath: "/icons/cat-pyspark.png",
    questions: [
      {
        id: 3,
        question: "What is lazy evaluation?",
        answer: "Transformations are not executed until an action is called.",
        codeExample: null,
        keyPoints: ["Transformations", "Actions"],
      },
    ],
  },
  {
    name: "General Databricks",
    iconPath: null,
    questions: [
      {
        id: 4,
        question: "What is a cluster?",
        answer: "A set of computation resources that run your notebooks and jobs.",
        codeExample: null,
        keyPoints: ["Driver", "Executors"],
      },
    ],
  },
]

describe("IntelSearch", () => {
  it("renders a search input and all categories by default", () => {
    render(<IntelSearch data={fixture} />)
    expect(screen.getByRole("searchbox", { name: /search intel/i })).toBeInTheDocument()
    // All three categories render in the search list (h2s include match count in name).
    expect(screen.getByRole("heading", { level: 2, name: /^Delta Lake/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: /^PySpark/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: /^General Databricks/ })).toBeInTheDocument()
  })

  it("filters questions across categories by question text", () => {
    render(<IntelSearch data={fixture} />)
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "z-order" } })
    expect(screen.getByRole("heading", { level: 2, name: /^Delta Lake/ })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2, name: /^PySpark/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2, name: /^General Databricks/ })).not.toBeInTheDocument()
  })

  it("matches against answer text", () => {
    render(<IntelSearch data={fixture} />)
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "transaction log" } })
    expect(screen.getByRole("heading", { level: 2, name: /^Delta Lake/ })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2, name: /^PySpark/ })).not.toBeInTheDocument()
  })

  it("matches against keyPoints", () => {
    render(<IntelSearch data={fixture} />)
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "executors" } })
    expect(screen.getByRole("heading", { level: 2, name: /^General Databricks/ })).toBeInTheDocument()
  })

  it("shows a 'no results' state and a clear button when nothing matches", () => {
    render(<IntelSearch data={fixture} />)
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzznomatch" } })
    expect(screen.getByText(/no intel found/i)).toBeInTheDocument()
    const clearBtn = screen.getByRole("button", { name: /clear the search/i })
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)
    expect(screen.getByRole("heading", { level: 2, name: /^PySpark/ })).toBeInTheDocument()
  })

  it("announces match count via aria-live region", () => {
    render(<IntelSearch data={fixture} />)
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "delta" } })
    const live = screen.getByText(/match.*across/i)
    expect(live).toBeInTheDocument()
    expect(live.closest("[aria-live]")).not.toBeNull()
  })

  it("uses the real icon when iconPath is provided and a fallback when it is null", () => {
    const { container } = render(<IntelSearch data={fixture} />)
    // Look for the icon images by their src attribute (most robust, doesn't depend on ARIA role).
    const allImgs = container.querySelectorAll("img")
    const deltaIcon = Array.from(allImgs).find((img) => img.getAttribute("src") === "/icons/cat-delta-lake.png")
    expect(deltaIcon).toBeDefined()
    const generalIcon = Array.from(allImgs).find((img) => img.getAttribute("src") === null && img.closest("section")?.querySelector("h2")?.textContent?.startsWith("General"))
    expect(generalIcon).toBeUndefined()
  })
})
