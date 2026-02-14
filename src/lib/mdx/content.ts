import fs from "fs"
import path from "path"
import matter from "gray-matter"
import type { z } from "zod/v4"

const contentDirectory = path.join(process.cwd(), "src/content")

/**
 * Reads and parses all MDX files from a content directory.
 * Returns frontmatter and raw content for each file.
 */
export async function getContentFiles<T>(
  subDir: string,
  schema: z.ZodType<T>,
): Promise<Array<{ slug: string; frontmatter: T; content: string }>> {
  const dir = path.join(contentDirectory, subDir)

  if (!fs.existsSync(dir)) {
    return []
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"))

  return files.map((filename) => {
    const filePath = path.join(dir, filename)
    const fileContent = fs.readFileSync(filePath, "utf-8")
    const { data, content } = matter(fileContent)
    const frontmatter = schema.parse(data)
    const slug = filename.replace(/\.mdx$/, "")

    return { slug, frontmatter, content }
  })
}

/**
 * Reads a single MDX file by slug from a content directory.
 * Returns parsed frontmatter and raw content.
 */
export async function getContentBySlug<T>(
  subDir: string,
  slug: string,
  schema: z.ZodType<T>,
): Promise<{ frontmatter: T; content: string } | null> {
  const filePath = path.join(contentDirectory, subDir, `${slug}.mdx`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContent = fs.readFileSync(filePath, "utf-8")
  const { data, content } = matter(fileContent)
  const frontmatter = schema.parse(data)

  return { frontmatter, content }
}

/**
 * Returns all available slugs for a content directory.
 * Useful for generateStaticParams().
 */
export function getContentSlugs(subDir: string): string[] {
  const dir = path.join(contentDirectory, subDir)

  if (!fs.existsSync(dir)) {
    return []
  }

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""))
}
