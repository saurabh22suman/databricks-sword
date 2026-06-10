/**
 * @file RichText.test.tsx
 * @description Unit tests for the shared RichText component (paragraphs,
 * bullet lists, and bold rendering for mission content).
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  detectBulletList,
  RichText,
  renderBulletList,
  renderInlineMarkdown,
  renderRichText,
} from "../RichText"

describe("renderInlineMarkdown", () => {
  it("returns plain string when no bold markers", () => {
    expect(renderInlineMarkdown("Hello world")).toEqual(["Hello world"])
  })

  it("converts **bold** to <strong> nodes", () => {
    const nodes = renderInlineMarkdown("This is **bold** text")
    const { container } = render(<>{nodes}</>)
    expect(container.querySelector("strong")?.textContent).toBe("bold")
    expect(container.textContent).toBe("This is bold text")
  })

  it("handles multiple bold segments in one string", () => {
    const nodes = renderInlineMarkdown("**one** and **two**")
    const { container } = render(<>{nodes}</>)
    expect(container.querySelectorAll("strong")).toHaveLength(2)
  })
})

describe("detectBulletList", () => {
  it("detects unordered list with - markers", () => {
    const result = detectBulletList("- a\n- b\n- c")
    expect(result).toEqual({ type: "ul", items: ["a", "b", "c"] })
  })

  it("detects unordered list with * markers", () => {
    expect(detectBulletList("* x\n* y")).toEqual({ type: "ul", items: ["x", "y"] })
  })

  it("detects ordered list", () => {
    expect(detectBulletList("1. one\n2. two")).toEqual({
      type: "ol",
      items: ["one", "two"],
    })
    expect(detectBulletList("1) one\n2) two")).toEqual({
      type: "ol",
      items: ["one", "two"],
    })
  })

  it("returns null for a single-item list (avoids false positive)", () => {
    expect(detectBulletList("- only one")).toBeNull()
  })

  it("returns null when a line is not a list item", () => {
    expect(detectBulletList("- a\nnot a list item\n- c")).toBeNull()
  })
})

describe("renderBulletList", () => {
  it("renders a <ul> with disc styling for unordered", () => {
    const { container } = render(<>{renderBulletList("- one\n- two")!}</>)
    const ul = container.querySelector("ul")
    expect(ul).not.toBeNull()
    expect(ul?.className).toMatch(/list-disc/)
    expect(ul?.querySelectorAll("li")).toHaveLength(2)
  })

  it("renders an <ol> with decimal styling for ordered", () => {
    const { container } = render(<>{renderBulletList("1. one\n2. two")!}</>)
    const ol = container.querySelector("ol")
    expect(ol).not.toBeNull()
    expect(ol?.className).toMatch(/list-decimal/)
  })
})

describe("renderRichText", () => {
  it("splits on blank lines into <p> elements", () => {
    const out = renderRichText("First paragraph.\n\nSecond paragraph.")
    const { container } = render(<>{out}</>)
    const paragraphs = container.querySelectorAll("p")
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0].textContent).toBe("First paragraph.")
    expect(paragraphs[1].textContent).toBe("Second paragraph.")
  })

  it("renders bullet list as <ul> within a block of text", () => {
    const out = renderRichText("Intro paragraph.\n\n- a\n- b\n- c")
    const { container } = render(<>{out}</>)
    expect(container.querySelectorAll("p")).toHaveLength(1)
    expect(container.querySelector("ul")?.querySelectorAll("li")).toHaveLength(3)
  })

  it("processes **bold** in each paragraph", () => {
    const out = renderRichText("**strong** then plain")
    const { container } = render(<>{out}</>)
    expect(container.querySelector("strong")?.textContent).toBe("strong")
  })
})

describe("RichText wrapper", () => {
  it("renders with default styling and applies className", () => {
    const { container } = render(
      <RichText text="Hello **world**" className="custom-class" />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toMatch(/text-anime-300/)
    expect(wrapper.className).toMatch(/custom-class/)
    expect(wrapper.querySelector("strong")?.textContent).toBe("world")
  })

  it("renders mission-debrief style content (multi-section with bullets)", () => {
    const text = `You built a **Delta Lake** table with full CRUD support.

- **Schema enforcement** with optional evolution
- **Time travel** for reproducibility
- **Unified batch and streaming** workloads

This is the **foundation** of modern data engineering.`
    const { container } = render(<RichText text={text} />)
    // Two prose paragraphs + one <ul> from a blank-line-separated bullet run
    expect(container.querySelectorAll("p")).toHaveLength(2)
    const ul = container.querySelector("ul")
    expect(ul?.querySelectorAll("li")).toHaveLength(3)
    // Bold is rendered in both the prose and the list items
    const strongs = container.querySelectorAll("strong")
    expect(strongs.length).toBeGreaterThanOrEqual(4)
  })

  it("renders ### markdown headings as <h3> elements", () => {
    const text = `You mastered the architecture.

### Storage Layer
- **Parquet files** for columnar efficiency
- **Transaction log** for ACID

### Compute Layer
- **Photon** for vectorized SQL

This concludes the mission.`
    const { container } = render(<RichText text={text} />)
    // Two <h3>s from ### headings
    expect(container.querySelectorAll("h3")).toHaveLength(2)
    // Two prose paragraphs
    expect(container.querySelectorAll("p")).toHaveLength(2)
    // One <ul> for the bullets under each heading (lists are emitted separately)
    const lists = container.querySelectorAll("ul")
    expect(lists.length).toBe(2)
    expect(lists[0].querySelectorAll("li")).toHaveLength(2)
    expect(lists[1].querySelectorAll("li")).toHaveLength(1)
    // No literal "###" should appear anywhere
    expect(container.textContent).not.toMatch(/###\s/)
  })

  it("renders #### markdown headings as <h4> elements", () => {
    const text = `#### Best Practices
- Always use **managed tables**`
    const { container } = render(<RichText text={text} />)
    expect(container.querySelector("h4")).not.toBeNull()
    expect(container.querySelector("h4")?.textContent).toBe("Best Practices")
  })
})
