---
mode: "agent"
description: "Scaffold a new learning page with MDX content and metadata"
---

# Create Learning Page

Create a new learning content page for the Databricks Sword platform.

## Steps

1. Create the MDX content file in `src/content/learn/{{category}}/{{slug}}.mdx`
2. Add proper frontmatter with all required fields
3. Structure content with introduction, sections, examples, and assessment
4. Include appropriate custom components

## MDX Template

```mdx
---
title: "{{Title}}"
description: "{{Description}}"
category: "{{fundamentals|data-engineering|data-science|sql-analytics|mlops}}"
difficulty: "{{beginner|intermediate|advanced}}"
tags: ["tag1", "tag2"]
order: {{number}}
estimatedTime: "{{X}} min"
prerequisites: []
publishedAt: "{{YYYY-MM-DD}}"
updatedAt: "{{YYYY-MM-DD}}"
---

Brief introduction explaining what the learner will understand after this module.

## Why This Matters

Context about real-world relevance.

## Key Concepts

### Concept 1

Explanation with examples.

<Callout type="info">
Important note about this concept.
</Callout>

### Hands-On Exercise

<CodePlayground
  language="python"
  simulationId="{{unique-id}}"
  starterCode={`# Your code here`}
  expectedPattern="expected_function_call"
  simulatedOutput={`Expected output here`}
/>

## Knowledge Check

<Quiz questions={[
  {
    question: "What is...?",
    options: ["A", "B", "C", "D"],
    correctAnswer: 0,
    explanation: "Because..."
  }
]} />

## Key Terms

<Flashcard front="Term" back="Definition and explanation" />

## Summary

Brief recap of what was covered.
```
