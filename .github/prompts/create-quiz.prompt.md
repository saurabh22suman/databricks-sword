---
mode: "agent"
description: "Generate quiz questions for a specific Databricks topic"
---

# Create Quiz

Generate quiz questions for testing knowledge on a Databricks topic.

## Instructions

1. Create 5-10 multiple-choice questions per topic
2. Each question needs: question text, 4 options, correct answer index, and detailed explanation
3. Mix difficulty levels: 2-3 easy, 3-4 intermediate, 1-2 advanced
4. Focus on practical understanding, not memorization
5. Include code-based questions where appropriate

## Schema

```typescript
type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: number // index into options array
  explanation: string
  difficulty: "beginner" | "intermediate" | "advanced"
  tags: string[]
}
```

## Guidelines

- Questions should test conceptual understanding AND practical application
- Explanations should teach, not just confirm — explain WHY the answer is correct
- Include scenario-based questions ("You need to process streaming data...")
- Code snippet questions should use PySpark or Databricks SQL syntax
- Avoid trick questions or ambiguous wording
- Each distractor (wrong answer) should be plausible and address a common misconception
