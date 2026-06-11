import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { _resetRunCliExecutor, _setRunCliExecutor, runCli } from "../cli"
import type { RunCliExecutor } from "../cli"

describe("runCli structured result", () => {
  let mockExecutor: ReturnType<typeof vi.fn<RunCliExecutor>>

  beforeEach(() => {
    mockExecutor = vi.fn<RunCliExecutor>()
    _setRunCliExecutor(mockExecutor)
  })

  afterEach(() => {
    _resetRunCliExecutor()
    vi.restoreAllMocks()
  })

  it("returns success result on exit 0", async () => {
    mockExecutor.mockResolvedValue({ stdout: "ok", stderr: "" })
    const r = await runCli(
      { workspaceUrl: "https://x", token: "t", warehouseId: "w", catalog: "c" },
      ["catalogs", "list"]
    )
    expect(r.success).toBe(true)
    expect(r.stdout).toBe("ok")
    expect(r.errorCategory).toBeUndefined()
  })

  it("returns commandFailed on non-zero exit", async () => {
    mockExecutor.mockRejectedValue(new Error("exit 1: bad arg"))
    const r = await runCli(
      { workspaceUrl: "https://x", token: "t", warehouseId: "w", catalog: "c" },
      ["fs", "cp", "a", "b"]
    )
    expect(r.success).toBe(false)
    expect(r.errorCategory).toBe("commandFailed")
  })

  it("classifies auth failures", async () => {
    mockExecutor.mockRejectedValue(new Error("401 Unauthorized"))
    const r = await runCli(
      { workspaceUrl: "https://x", token: "t", warehouseId: "w", catalog: "c" },
      ["catalogs", "list"]
    )
    expect(r.success).toBe(false)
    expect(r.errorCategory).toBe("authFailed")
  })

  it("classifies resource-not-found failures", async () => {
    mockExecutor.mockRejectedValue(new Error("RESOURCE_DOES_NOT_EXIST"))
    const r = await runCli(
      { workspaceUrl: "https://x", token: "t", warehouseId: "w", catalog: "c" },
      ["schemas", "delete", "x.y"]
    )
    expect(r.success).toBe(false)
    expect(r.errorCategory).toBe("resourceNotFound")
  })

  it("passes cwd and timeout to the executor", async () => {
    mockExecutor.mockResolvedValue({ stdout: "", stderr: "" })
    await runCli(
      { workspaceUrl: "https://x", token: "t", warehouseId: "w", catalog: "c" },
      ["bundle", "deploy"],
      { cwd: "/tmp/bundle-1", timeoutMs: 5000 }
    )
    expect(mockExecutor).toHaveBeenCalledWith(
      "databricks",
      ["bundle", "deploy"],
      expect.objectContaining({ cwd: "/tmp/bundle-1", timeout: 5000 })
    )
  })
})