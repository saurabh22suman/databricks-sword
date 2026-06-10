/**
 * @file RichText.tsx
 * @description Lightweight inline markdown renderer for mission / debrief
 * content blocks. Handles:
 *   - Paragraph splitting on blank lines
 *   - Bullet lists (`- item`, `* item`, `1. item`, `1) item`)
 *   - Bold (`**text**`) → <strong>
 *
 * Content is sourced from MDX files via the loader, so it may contain light
 * markdown. We intentionally support only the subset editors actually use.
 * Anything more complex (tables, code blocks, images) belongs in dedicated
 * MDX components, not in this renderer.
 */

import React from "react"
import { cn } from "@/lib/utils"

const BOLD_REGEX = /\*\*(.+?)\*\*/g
const UNORDERED_ITEM = /^[-*]\s+(.+)$/
const ORDERED_ITEM = /^\d+[.)]\s+(.+)$/

/**
 * Parse inline markdown (`**bold**`) into a list of React nodes.
 * Non-bold text is preserved as plain strings; bold segments become
 * <strong> elements so screen readers and copy/paste work correctly.
 */
export function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Always reset the regex state before use — globals can leak between calls.
  BOLD_REGEX.lastIndex = 0
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = BOLD_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    nodes.push(<strong key={`b-${key++}`}>{match[1]}</strong>)
    lastIndex = BOLD_REGEX.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

interface BulletListDetection {
  type: "ul" | "ol"
  items: string[]
}

/**
 * Detects if a paragraph is a bullet list (ordered or unordered).
 * Returns `{ type, items }` or `null` when the paragraph is not a list.
 */
export function detectBulletList(paragraph: string): BulletListDetection | null {
  const lines = paragraph.split("\n").map((line) => line.trim())
  const items: string[] = []
  let isOrdered = false

  for (const line of lines) {
    const ulMatch = line.match(UNORDERED_ITEM)
    if (ulMatch) {
      items.push(ulMatch[1])
      continue
    }

    const olMatch = line.match(ORDERED_ITEM)
    if (olMatch) {
      items.push(olMatch[1])
      isOrdered = true
      continue
    }

    // Not a list item — stop processing.
    return null
  }

  // Need at least 2 items to be considered a list (avoids false positives
  // on a single "- item" line in prose).
  if (items.length < 2) {
    return null
  }

  return { type: isOrdered ? "ol" : "ul", items }
}

/**
 * Inline-block representation used by renderRichText. Splits the source
 * into pieces the renderer can map 1:1 to elements.
 */
type RichBlock =
  | { kind: "heading"; level: 3 | 4 | 5 | 6; text: string }
  | { kind: "list"; type: "ul" | "ol"; items: string[] }
  | { kind: "paragraph"; text: string }

/**
 * Split a string into structured blocks (headings, bullet lists, paragraphs).
 * Headings are detected at the start of any line and pulled into their own
 * blocks so they render as <h3>/<h4>/etc. rather than as literal `###` text.
 *
 * Bullet lists are detected as 2+ consecutive lines all matching the same
 * list-item pattern. Anything else is treated as a regular paragraph.
 */
export function splitIntoBlocks(text: string): RichBlock[] {
  const lines = text.split("\n")
  const blocks: RichBlock[] = []
  let paragraphBuffer: string[] = []
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    const text = paragraphBuffer.join(" ").trim()
    if (text.length > 0) {
      blocks.push({ kind: "paragraph", text })
    }
    paragraphBuffer = []
  }
  const flushList = () => {
    if (listBuffer && listBuffer.items.length > 0) {
      blocks.push({ kind: "list", ...listBuffer })
    }
    listBuffer = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.length === 0) {
      flushParagraph()
      flushList()
      continue
    }

    // Markdown heading: ### text, #### text, etc.
    const headingMatch = line.match(/^(#{3,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length as 3 | 4 | 5 | 6
      blocks.push({ kind: "heading", level, text: headingMatch[2] })
      continue
    }

    const ulMatch = line.match(UNORDERED_ITEM)
    if (ulMatch) {
      flushParagraph()
      if (listBuffer && listBuffer.type !== "ul") flushList()
      if (!listBuffer) listBuffer = { type: "ul", items: [] }
      listBuffer.items.push(ulMatch[1])
      continue
    }

    const olMatch = line.match(ORDERED_ITEM)
    if (olMatch) {
      flushParagraph()
      if (listBuffer && listBuffer.type !== "ol") flushList()
      if (!listBuffer) listBuffer = { type: "ol", items: [] }
      listBuffer.items.push(olMatch[1])
      continue
    }

    // Regular prose line.
    flushList()
    paragraphBuffer.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}

/**
 * Renders a bullet-list paragraph as a semantic <ul> or <ol>.
 * Returns `null` when the paragraph is not a list.
 */
export function renderBulletList(paragraph: string): React.ReactElement | null {
  const result = detectBulletList(paragraph)
  if (!result) return null

  const { type, items } = result
  const ListTag = type === "ol" ? "ol" : "ul"
  const listStyle = type === "ol" ? "list-decimal" : "list-disc"

  return (
    <ListTag
      key={`list-${paragraph.slice(0, 20)}`}
      className={`${listStyle} ml-6 my-2 space-y-1`}
    >
      {items.map((item, index) => (
        <li key={`li-${index}`} className="text-anime-300">
          {renderInlineMarkdown(item)}
        </li>
      ))}
    </ListTag>
  )
}

/**
 * Renders a multi-paragraph string with full light-markdown support:
 *   - `### heading` / `#### heading` → <h3>/<h4>
 *   - blank-line-separated bullet runs → semantic <ul>/<ol>
 *   - everything else → <p> with **bold** rendered as <strong>
 */
export function renderRichText(text: string): React.ReactElement[] {
  // Split first on blank lines so headings/lists get their own group, then
  // splitIntoBlocks handles single-line structures within each group.
  const groups = text.split(/\n{2,}/)
  const elements: React.ReactElement[] = []
  let pIndex = 0

  for (const group of groups) {
    if (group.trim().length === 0) continue
    const blocks = splitIntoBlocks(group)

    for (const block of blocks) {
      switch (block.kind) {
        case "heading": {
          // ## (h2) and above are reserved for the section titles (set by
          // the page). Only ### (h3) and deeper appear here as in-paragraph
          // sub-section labels, so we render them as styled <h3>/<h4>/etc.
          const sizeClass =
            block.level === 3
              ? "text-lg font-heading font-bold text-anime-cyan mt-3"
              : block.level === 4
                ? "text-base font-heading font-semibold text-anime-cyan mt-2"
                : "text-sm font-heading font-semibold text-anime-cyan mt-2"
          const Tag = `h${block.level}` as "h3" | "h4" | "h5" | "h6"
          elements.push(
            <Tag key={`h-${elements.length}`} className={sizeClass}>
              {renderInlineMarkdown(block.text)}
            </Tag>,
          )
          break
        }
        case "list": {
          const ListTag = block.type
          const listStyle = block.type === "ol" ? "list-decimal" : "list-disc"
          elements.push(
            <ListTag
              key={`l-${elements.length}`}
              className={`${listStyle} ml-6 my-2 space-y-1`}
            >
              {block.items.map((item, i) => (
                <li key={`li-${i}`} className="text-anime-300">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ListTag>,
          )
          break
        }
        case "paragraph": {
          elements.push(
            <p key={`p-${pIndex++}`}>{renderInlineMarkdown(block.text)}</p>,
          )
          break
        }
      }
    }
  }

  return elements
}

export interface RichTextProps {
  /** Raw text with light markdown (paragraphs, bullets, bold). */
  text: string
  /** Extra className applied to the wrapper <div>. */
  className?: string
}

/**
 * Drop-in <div> wrapper that renders light markdown with proper paragraphs,
 * bullet lists, and bold. Use this anywhere a string from a content file
 * needs to be displayed with structure. The default classes can be
 * extended via `className` (e.g. for tighter spacing inside a sidebar).
 */
export function RichText({ text, className }: RichTextProps): React.ReactElement {
  return (
    <div
      className={cn(
        "text-anime-300 leading-relaxed space-y-3",
        className,
      )}
    >
      {renderRichText(text)}
    </div>
  )
}
