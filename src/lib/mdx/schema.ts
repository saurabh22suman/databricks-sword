import { z } from "zod/v4"

/**
 * Schema for learning content MDX frontmatter.
 */
export const learnFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum([
    "fundamentals",
    "data-engineering",
    "data-science",
    "sql-analytics",
    "mlops",
  ]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  tags: z.array(z.string()),
  order: z.number().int().positive(),
  estimatedTime: z.string(),
  prerequisites: z.array(z.string()).default([]),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
})

/**
 * Schema for blog post MDX frontmatter.
 */
export const blogFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  author: z.string().default("Databricks Sword"),
  tags: z.array(z.string()),
  category: z.enum([
    "tutorials",
    "best-practices",
    "architecture",
    "news",
    "deep-dive",
  ]),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
  featured: z.boolean().default(false),
  coverImage: z.string().optional(),
})

/**
 * Schema for market use case MDX frontmatter.
 */
export const useCaseFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  market: z.enum([
    "financial-services",
    "healthcare",
    "retail",
    "manufacturing",
    "media",
    "public-sector",
  ]),
  tags: z.array(z.string()),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
})

/**
 * Schema for FAQ MDX frontmatter.
 */
export const faqFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum([
    "general",
    "delta-lake",
    "pyspark",
    "sql",
    "mlflow",
    "architecture",
    "unity-catalog",
  ]),
  order: z.number().int().positive(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  publishedAt: z.string(),
})

/** Inferred types from schemas */
export type LearnFrontmatter = z.infer<typeof learnFrontmatterSchema>
export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>
export type UseCaseFrontmatter = z.infer<typeof useCaseFrontmatterSchema>
export type FaqFrontmatter = z.infer<typeof faqFrontmatterSchema>
