import { describe, it, expect } from "vitest"
import { cn, formatDate, calculateReadingTime, slugify } from "../utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz")
  })

  it("resolves Tailwind conflicts", () => {
    expect(cn("px-4", "px-6")).toBe("px-6")
  })

  it("handles empty inputs", () => {
    expect(cn()).toBe("")
  })
})

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2026-01-15")
    expect(result).toContain("January")
    expect(result).toContain("2026")
  })

  it("formats a Date object", () => {
    const result = formatDate(new Date("2026-06-01"))
    expect(result).toContain("June")
    expect(result).toContain("2026")
  })
})

describe("calculateReadingTime", () => {
  it("returns 1 min for short text", () => {
    expect(calculateReadingTime("hello world")).toBe("1 min read")
  })

  it("calculates correct time for longer text", () => {
    const words = Array(400).fill("word").join(" ")
    expect(calculateReadingTime(words)).toBe("2 min read")
  })
})

describe("slugify", () => {
  it("converts to lowercase kebab-case", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })

  it("removes special characters", () => {
    expect(slugify("What is Delta Lake?")).toBe("what-is-delta-lake")
  })

  it("collapses multiple dashes", () => {
    expect(slugify("foo  --  bar")).toBe("foo-bar")
  })
})
