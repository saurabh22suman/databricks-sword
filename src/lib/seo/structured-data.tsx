/**
 * Structured data (JSON-LD) utilities for SEO.
 * Provides schema.org markup for Course and FAQ pages.
 */

/**
 * Generates Course structured data for the landing page.
 * @see https://schema.org/Course
 */
export function getCourseStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Databricks Sword — Gamified Databricks Mastery",
    description:
      "Master the Databricks ecosystem through gamified missions, interactive challenges, and spaced repetition. Learn Delta Lake, PySpark, MLflow, Unity Catalog, and more.",
    provider: {
      "@type": "Organization",
      name: "Databricks Sword",
      sameAs: "https://databricks-sword.com",
    },
    educationalLevel: "Beginner to Advanced",
    teaches: [
      "Databricks Platform",
      "Delta Lake",
      "PySpark",
      "Apache Spark",
      "Structured Streaming",
      "MLflow",
      "Unity Catalog",
      "Data Engineering",
      "Data Science",
      "Machine Learning Engineering",
    ],
    coursePrerequisites:
      "Basic understanding of Python and SQL recommended but not required",
    educationalCredentialAwarded: "Digital Badges and Achievements",
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: "PT20H", // ~20 hours for all missions
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      category: "Free",
    },
    keywords: [
      "Databricks",
      "Data Engineering",
      "PySpark",
      "Delta Lake",
      "MLflow",
      "Unity Catalog",
      "Gamified Learning",
      "Interactive Tutorial",
    ],
  }
}

/**
 * Generates FAQPage structured data for the FAQ page.
 * @see https://schema.org/FAQPage
 */
export function getFAQStructuredData() {
  const questions = [
    {
      question: "Managed vs External Tables?",
      answer:
        "Managed tables store data in the location managed by Databricks (usually DBFS or Unity Catalog managed storage). Dropping the table deletes the data. External tables reference data stored in your own cloud storage paths (S3/ADLS). Dropping the table only removes metadata.",
    },
    {
      question: "Delta Lake ACID Transactions?",
      answer:
        "Delta Lake uses a transaction log (Delta Log) to record every change made to the table. This enables atomicity (all or nothing), consistency, isolation (via optimistic concurrency control), and durability.",
    },
    {
      question: "Z-Ordering Protocol?",
      answer:
        "Z-Ordering is a data skipping technique that co-locates related information in the same set of files. It is most effective for columns that are frequently used in query predicates (WHERE clauses) and have high cardinality.",
    },
    {
      question: "Photon Engine Specs?",
      answer:
        "Photon is a native vectorized query engine written in C++ to improve query performance. It is designed to accelerate SQL workloads and DataFrame API calls by taking advantage of modern hardware instruction sets.",
    },
    {
      question: "Unity Catalog Governance?",
      answer:
        "Unity Catalog is the unified governance solution for Data & AI on the Lakehouse. It provides a central place to manage permissions, audit logs, and data lineage across multiple Databricks workspaces.",
    },
  ]

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  }
}

/**
 * Component to inject JSON-LD structured data into page head.
 */
export function StructuredData({
  data,
}: {
  data: ReturnType<typeof getCourseStructuredData | typeof getFAQStructuredData>
}): React.ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
