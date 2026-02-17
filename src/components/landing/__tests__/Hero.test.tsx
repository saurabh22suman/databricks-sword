import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { Hero } from "../Hero"

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ArrowRight: () => <span data-testid="arrow-right" />,
  Play: () => <span data-testid="play" />,
  Cpu: () => <span data-testid="cpu" />,
}))

// Mock fetch for stats API
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ userCount: 5, unitsDeployed: 15 }),
    })
  ) as unknown as typeof fetch
})

describe("Hero", () => {
  it("renders the main heading", () => {
    render(<Hero />)
    expect(
      screen.getByRole("heading", { level: 1 }),
    ).toBeInTheDocument()
  })

  it("renders LIMIT BREAK in the heading", () => {
    render(<Hero />)
    expect(screen.getByText("LIMIT")).toBeInTheDocument()
    expect(screen.getByText("BREAK")).toBeInTheDocument()
  })

  it("renders the Start Mission CTA link", () => {
    render(<Hero />)
    expect(
      screen.getByRole("link", { name: /start mission/i }),
    ).toHaveAttribute("href", "/missions")
  })

  it("renders the System Online badge", () => {
    render(<Hero />)
    expect(screen.getByText("System Online")).toBeInTheDocument()
  })

  it("renders the stats section with fetched units deployed", async () => {
    render(<Hero />)
    expect(screen.getByText("Units Deployed")).toBeInTheDocument()
    expect(screen.getByText("4.9")).toBeInTheDocument()
    expect(screen.getByText("System Rating")).toBeInTheDocument()
    // Wait for fetch to complete and check the dynamic value
    await waitFor(() => {
      expect(screen.getByText("15")).toBeInTheDocument()
    })
  })

  it("renders the code editor preview", () => {
    render(<Hero />)
    expect(screen.getByText("Main_System.py")).toBeInTheDocument()
  })

  it("renders the Protocol Sword text", () => {
    render(<Hero />)
    expect(screen.getByText("Protocol Sword")).toBeInTheDocument()
  })

  it("renders the status footer", () => {
    render(<Hero />)
    expect(screen.getByText("STATUS: OPTIMIZED")).toBeInTheDocument()
  })
})
