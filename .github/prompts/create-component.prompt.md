---
mode: "agent"
description: "Scaffold a new React component with TypeScript, Tailwind, and co-located test file"
---

# Create Component

Create a new React component for the Databricks Sword project.

## Instructions

1. Determine if this should be a **Server Component** (default) or **Client Component** (needs interactivity)
2. Create the component file with proper TypeScript types
3. Create a co-located test file in `__tests__/` directory
4. Follow naming conventions: `PascalCase.tsx` for components

## Template

### Server Component
```tsx
import { cn } from "@/lib/utils"

type {{ComponentName}}Props = {
  // props
}

/**
 * Brief description of what this component does
 */
export function {{ComponentName}}({ ...props }: {{ComponentName}}Props): React.ReactElement {
  return (
    <div className={cn("...")}>
      {/* Component content */}
    </div>
  )
}
```

### Client Component
```tsx
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

type {{ComponentName}}Props = {
  // props
}

/**
 * Brief description of what this component does
 */
export function {{ComponentName}}({ ...props }: {{ComponentName}}Props): React.ReactElement {
  return (
    <div className={cn("...")}>
      {/* Component content */}
    </div>
  )
}
```

### Test File
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { {{ComponentName}} } from '../{{ComponentName}}'

describe('{{ComponentName}}', () => {
  it('renders successfully', () => {
    render(<{{ComponentName}} />)
    // Add meaningful assertions
  })
})
```

Create the component now following these patterns. Ask what the component should do if not clear from context.
