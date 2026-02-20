import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Header } from "../Header"

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: null,
    status: "unauthenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Menu: () => <span data-testid="menu-icon" />,
  Sword: () => <span data-testid="sword-icon" />,
  User: () => <span data-testid="user-icon" />,
  X: () => <span data-testid="x-icon" />,
  Shield: () => <span data-testid="shield-icon" />,
  Swords: () => <span data-testid="swords-icon" />,
  Target: () => <span data-testid="target-icon" />,
  Trophy: () => <span data-testid="trophy-icon" />,
  Flame: () => <span data-testid="flame-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
  Award: () => <span data-testid="award-icon" />,
  Settings: () => <span data-testid="settings-icon" />,
  LogOut: () => <span data-testid="logout-icon" />,
}))

describe("Header", () => {
  it("renders the site logo/title", () => {
    render(<Header />)
    expect(screen.getByText("SWORD")).toBeInTheDocument()
  })

  it("renders the DB prefix in the logo", () => {
    render(<Header />)
    expect(screen.getByText("DB")).toBeInTheDocument()
  })

  it("renders the PROJECT ALICE subtitle", () => {
    render(<Header />)
    expect(screen.getByText("PROJECT ALICE")).toBeInTheDocument()
  })

  it("renders navigation links", () => {
    render(<Header />)
    expect(screen.getByText("Missions")).toBeInTheDocument()
    expect(screen.getByText("Intel")).toBeInTheDocument()
    expect(screen.getByText("⚡ Field Ops")).toBeInTheDocument()
    expect(screen.getByText("Map")).toBeInTheDocument()
    expect(screen.getByText("Leaderboard")).toBeInTheDocument()
    expect(screen.getByText("Logs")).toBeInTheDocument()
  })

  it("renders Missions link", () => {
    render(<Header />)
    expect(screen.getByRole("link", { name: "Missions" })).toHaveAttribute(
      "href",
      "/missions",
    )
  })

  it("links Intel, Leaderboard, and Logs to canonical pages", () => {
    render(<Header />)
    expect(screen.getByRole("link", { name: "Intel" })).toHaveAttribute(
      "href",
      "/intel",
    )
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute(
      "href",
      "/leaderboard",
    )
    expect(screen.getByRole("link", { name: "Logs" })).toHaveAttribute(
      "href",
      "/blog",
    )
  })

  it("renders Start Training CTA", () => {
    render(<Header />)
    expect(screen.getByText("Start Training")).toBeInTheDocument()
  })
})
