import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { UseCases } from "../UseCases"

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Target: () => <span data-testid="target-icon" />,
  Shield: () => <span data-testid="shield-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
  Globe: () => <span data-testid="globe-icon" />,
  Cpu: () => <span data-testid="cpu-icon" />,
}))

describe("UseCases", () => {
  it("renders the section heading", () => {
    render(<UseCases />)
    expect(
      screen.getByRole("heading", { name: /active campaigns/i }),
    ).toBeInTheDocument()
  })

  it("renders the Mission Select label", () => {
    render(<UseCases />)
    expect(screen.getByText("Mission Select")).toBeInTheDocument()
  })

  it("renders all 4 campaign titles", () => {
    render(<UseCases />)
    expect(screen.getByText("FinTech Fraud Defense")).toBeInTheDocument()
    expect(screen.getByText("IoT Sensor Grid")).toBeInTheDocument()
    expect(screen.getByText("E-Comm Neural Net")).toBeInTheDocument()
    expect(screen.getByText("Genomics Sequence")).toBeInTheDocument()
  })

  it("renders descriptions for each campaign", () => {
    render(<UseCases />)
    expect(screen.getByText(/fraudulent transactions/i)).toBeInTheDocument()
    expect(screen.getByText(/telemetry uplink/i)).toBeInTheDocument()
    expect(screen.getByText(/predictive algorithms/i)).toBeInTheDocument()
    expect(screen.getByText(/DNA sequences/i)).toBeInTheDocument()
  })

  it("renders difficulty ranks for campaigns", () => {
    render(<UseCases />)
    const sRanks = screen.getAllByText("S-RANK")
    expect(sRanks).toHaveLength(2)
    expect(screen.getByText("A-RANK")).toBeInTheDocument()
    expect(screen.getByText("B-RANK")).toBeInTheDocument()
  })

  it("renders View All Logs button", () => {
    render(<UseCases />)
    expect(screen.getByText(/view all logs/i)).toBeInTheDocument()
  })
})
