"use client"

import type { XpEvent } from "./types"

/**
 * Lightweight event bus for XP events.
 * Allows any component to subscribe and react when XP is awarded.
 * Used to drive animations in the header and toast notifications.
 */

type XpEventListener = (event: XpEvent) => void

const listeners = new Set<XpEventListener>()

/**
 * Subscribe to XP events.
 * Returns an unsubscribe function.
 */
export function onXpEvent(listener: XpEventListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Emit an XP event to all subscribers.
 * Called by xpService after every XP award.
 */
export function emitXpEvent(event: XpEvent): void {
  for (const listener of listeners) {
    listener(event)
  }
}