---
mode: "agent"
description: "Generate a market use case page for a specific industry"
---

# Create Use Case

Create a market use case page showcasing how Databricks is used in a specific industry.

## Steps

1. Create MDX file in `src/content/use-cases/{{market-slug}}.mdx`
2. Include industry overview, common use cases, architecture diagram, and implementation examples

## Template

```mdx
---
title: "Databricks for {{Industry}}"
description: "How {{industry}} organizations use Databricks for data and AI"
market: "{{financial-services|healthcare|retail|manufacturing|media|public-sector}}"
tags: ["use-case", "{{industry-tag}}"]
publishedAt: "{{YYYY-MM-DD}}"
updatedAt: "{{YYYY-MM-DD}}"
---

## Industry Overview

Brief overview of data challenges in this industry.

## Top Use Cases

### Use Case 1: {{Name}}
- **Business Problem:** What pain point does this solve?
- **Databricks Solution:** Which features/products are used?
- **Impact:** Quantifiable business outcomes

<Diagram type="mermaid" id="{{use-case-architecture}}" />

### Use Case 2: {{Name}}
...

## Reference Architecture

<Diagram type="mermaid" id="{{industry-architecture}}" />

### Sample Implementation

<CodePlayground
  language="python"
  simulationId="{{industry-example}}"
  starterCode={`# {{Industry}} data pipeline example`}
  simulatedOutput={`Sample output`}
/>

## Key Takeaways

Summary of why Databricks is valuable for this industry.
```

## Markets Covered

1. Financial Services — fraud detection, risk analytics, regulatory reporting
2. Healthcare & Life Sciences — patient analytics, drug discovery, clinical trials
3. Retail & E-Commerce — recommendations, demand forecasting, customer 360
4. Manufacturing & IoT — predictive maintenance, quality control, supply chain
5. Media & Entertainment — content recommendation, audience analytics
6. Public Sector / Government — citizen services, compliance, open data
