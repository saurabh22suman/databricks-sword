/**
 * @file SandboxSyncProvider.tsx
 * @description Thin client wrapper that activates sandbox sync for authenticated users.
 * Mount inside the root layout below SessionProvider.
 */

"use client"

import { useSandboxSync } from "@/lib/sandbox/useSandboxSync"
import React from "react"

/**
 * Activates background sandbox sync (pull on mount, push on tab hide).
 * Renders children without any visual output of its own.
 */
export function SandboxSyncProvider({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  useSandboxSync()
  return <>{children}</>
}
