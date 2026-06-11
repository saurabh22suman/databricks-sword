import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { _resetRunCliExecutor, _setRunCliExecutor, runCli, pipelineStart, pipelineState } from "../cli"
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

describe("pipelineStart", () => {
  let mockExecutor: ReturnType<typeof vi.fn<RunCliExecutor>>

  beforeEach(() => {
    mockExecutor = vi.fn<RunCliExecutor>()
    _setRunCliExecutor(mockExecutor)
  })

  afterEach(() => {
    _resetRunCliExecutor()
    vi.restoreAllMocks()
  })

  it("calls databricks pipelines start --pipeline <name>", async () => {
    mockExecutor.mockResolvedValue({ stdout: "", stderr: "" })
    await pipelineStart(
      { workspaceUrl: "https://x", token: "t", warehouseId: "w", catalog: "c" },
      "manufacturing_quality"
    )
    expect(mockExecutor).toHaveBeenCalledWith(
      "databricks",
      ["pipelines", "start", "--pipeline", "manufacturing_quality"],
      expect.any(Object)
    )
  })

  it("throws on failure", async () => {
    mockExecutor.mockRejectedValue(new Error("pipeline not found"))
    await expect(
      pipelineStart(
        { workspaceUrl: "https://x", token: "t", warehouseId: "w", catalog: "c" },
        "missing"
      )
    ).rejects.toThrow("pipeline not found")
  })
})

describe("pipelineState", () => {
  let mockExecutor: ReturnType<typeof vi.fn<RunCliExecutor>>

  beforeEach(() => {
    mockExecutor = vi.fn<RunCliExecutor>()
    _setRunCliExecutor(mockExecutor)
  })

  afterEach(() => {
    _resetRunCliExecutor()
    vi.restoreAllMocks()
  })

  it("returns parsed state from JSON output", async () => {
    mockExecutor.mockResolvedValue({
      stdout: JSON.stringify({ state: "RUNNING" }),
      stderr: "",
    })
    const state = await pipelineState(
      { workspaceUrl: "https://x", token: "t", warehouseId: "w", catalog: "c" },
      "manufacturing_quality"
    )
    expect(state).toBe("RUNNING")
  })

  it("returns null on failure", async () => {
    mockExecutor.mockRejectedValue(new Error("not found"))
    const state = await pipelineState(
      { workspaceUrl: "https://x", token: "t", warehouseId: "w", catalog: "c" },
      "missing"
    )
    expect(state).toBeNull()
  })
})