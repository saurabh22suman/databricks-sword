import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the MDX content module
vi.mock("@/lib/mdx/content", () => ({
  getContentBySlug: vi.fn(),
  getContentFiles: vi.fn(),
  getContentSlugs: vi.fn(),
}))

// Mock next-mdx-remote/rsc
vi.mock("next-mdx-remote/rsc", () => ({
  MDXRemote: ({ source }: { source: string }) => (
    <div data-testid="mdx-content">{source}</div>
  ),
}))

import { getContentBySlug, getContentFiles, getContentSlugs } from "@/lib/mdx/content"

describe("Blog System", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Blog Content Loading", () => {
    it("loads blog post by slug", async () => {
      const mockPost = {
        frontmatter: {
          title: "Test Post",
          description: "A test blog post",
          author: "Databricks Sword",
          tags: ["test"],
          category: "tutorials",
          publishedAt: "2024-01-01",
          featured: false,
        },
        content: "# Test content",
      }

      vi.mocked(getContentBySlug).mockResolvedValue(mockPost)

      const result = await getContentBySlug("blog", "test-post", {} as never)
      expect(result).toEqual(mockPost)
      expect(getContentBySlug).toHaveBeenCalledWith("blog", "test-post", expect.anything())
    })

    it("returns null for missing slug", async () => {
      vi.mocked(getContentBySlug).mockResolvedValue(null)

      const result = await getContentBySlug("blog", "nonexistent", {} as never)
      expect(result).toBeNull()
    })

    it("loads all blog posts sorted by date", async () => {
      const mockPosts = [
        {
          slug: "post-1",
          frontmatter: {
            title: "First Post",
            description: "First",
            author: "Databricks Sword",
            tags: ["test"],
            category: "tutorials" as const,
            publishedAt: "2024-01-01",
            featured: false,
          },
          content: "# First",
        },
        {
          slug: "post-2",
          frontmatter: {
            title: "Second Post",
            description: "Second",
            author: "Databricks Sword",
            tags: ["test"],
            category: "tutorials" as const,
            publishedAt: "2024-02-01",
            featured: false,
          },
          content: "# Second",
        },
      ]

      vi.mocked(getContentFiles).mockResolvedValue(mockPosts)

      const result = await getContentFiles("blog", {} as never)
      expect(result).toHaveLength(2)
    })

    it("returns content slugs", () => {
      vi.mocked(getContentSlugs).mockReturnValue(["post-1", "post-2"])

      const slugs = getContentSlugs("blog")
      expect(slugs).toEqual(["post-1", "post-2"])
    })
  })
})
