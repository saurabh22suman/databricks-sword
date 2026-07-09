import { describe, expect, it, vi } from "vitest"
import {
  notifySandboxChange,
  subscribeSandboxChange,
} from "../sandboxChangeBus"

describe("sandboxChangeBus", () => {
  describe("subscribeSandboxChange", () => {
    it("invokes listener when notifySandboxChange is called", () => {
      const listener = vi.fn()
      const unsubscribe = subscribeSandboxChange(listener)

      notifySandboxChange()

      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
    })

    it("invokes all subscribers", () => {
      const listenerA = vi.fn()
      const listenerB = vi.fn()

      const unsubA = subscribeSandboxChange(listenerA)
      const unsubB = subscribeSandboxChange(listenerB)

      notifySandboxChange()

      expect(listenerA).toHaveBeenCalledTimes(1)
      expect(listenerB).toHaveBeenCalledTimes(1)

      unsubA()
      unsubB()
    })

    it("stops invoking a listener after unsubscribe", () => {
      const listener = vi.fn()
      const unsubscribe = subscribeSandboxChange(listener)

      notifySandboxChange()
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      notifySandboxChange()
      expect(listener).toHaveBeenCalledTimes(1) // still 1, not 2
    })

    it("isolates listener exceptions so other subscribers still fire", () => {
      // If one listener throws, the bus must keep delivering to
      // remaining subscribers — otherwise a single buggy component
      // can silently freeze the entire UI when the sandbox updates.
      const buggyListener = vi.fn(() => {
        throw new Error("boom")
      })
      const healthyListener = vi.fn()

      const unsubBuggy = subscribeSandboxChange(buggyListener)
      const unsubHealthy = subscribeSandboxChange(healthyListener)

      expect(() => notifySandboxChange()).not.toThrow()

      expect(buggyListener).toHaveBeenCalledTimes(1)
      expect(healthyListener).toHaveBeenCalledTimes(1)

      unsubBuggy()
      unsubHealthy()
    })

    it("does not invoke listeners that were never subscribed", () => {
      const listener = vi.fn()
      // No subscribe call — just notify
      notifySandboxChange()
      expect(listener).not.toHaveBeenCalled()
    })

    it("allows a listener to safely unsubscribe itself during dispatch", () => {
      // Some components may want to detach on first event (e.g. one-shot
      // hydration listeners). The Set iteration must tolerate this.
      let unsub: (() => void) | null = null
      const listener = vi.fn(() => {
        if (unsub) unsub()
      })
      unsub = subscribeSandboxChange(listener)

      notifySandboxChange()
      notifySandboxChange()

      expect(listener).toHaveBeenCalledTimes(1)

      if (unsub) unsub()
    })
  })
})