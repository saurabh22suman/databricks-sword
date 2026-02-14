---
mode: "agent"
description: "Scaffold a new blog post with proper frontmatter and structure"
---

# Create Blog Post

Create a new blog post for the Databricks Sword blog section.

## Steps

1. Create MDX file in `src/content/blog/{{slug}}.mdx`
2. Add comprehensive frontmatter
3. Structure with introduction, body sections, and conclusion

## Template

```mdx
---
title: "{{Blog Post Title}}"
description: "{{SEO-friendly description, 150-160 chars}}"
author: "Databricks Sword"
tags: ["{{tag1}}", "{{tag2}}"]
category: "{{tutorials|best-practices|architecture|news|deep-dive}}"
publishedAt: "{{YYYY-MM-DD}}"
updatedAt: "{{YYYY-MM-DD}}"
featured: false
coverImage: "/images/blog/{{slug}}.webp"
---

## Introduction

Hook the reader with the problem or question this post addresses.

## Main Content

### Section 1

Content with code examples where relevant.

```python
# Code example
```

<Callout type="tip">
Pro tip for the reader.
</Callout>

### Section 2

More content...

## Conclusion

Key takeaways and next steps for the reader.

## Further Reading

- [Related Topic 1](/learn/...)
- [Related Topic 2](/learn/...)
```

## Guidelines

- Title: actionable, specific, SEO-friendly (50-60 chars)
- Description: compelling summary (150-160 chars)
- Opening: state the problem or value proposition in the first paragraph
- Include code examples, diagrams, or screenshots where helpful
- End with clear takeaways and links to related learning content
- Target 800-1500 words for standard posts
