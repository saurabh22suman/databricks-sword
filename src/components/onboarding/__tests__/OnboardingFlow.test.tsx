import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { OnboardingFlow } from "../OnboardingFlow"

// next/navigation: provide a controllable mock so router.push is observable.
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

// next/link: simple passthrough so tests can read href and click.
vi.mock("next/link", () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}))

describe("OnboardingFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("renders the welcome step initially", () => {
    render(<OnboardingFlow />)
    expect(screen.getByText(/welcome, operator/i)).toBeInTheDocument()
  })

  it("advances to the ranks step when Next is clicked", () => {
    render(<OnboardingFlow />)
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    expect(screen.getByText(/ranks & xp/i)).toBeInTheDocument()
  })

  it("advances through all 4 steps and lands on the dashboard via skip", () => {
    render(<OnboardingFlow />)
    fireEvent.click(screen.getByRole("button", { name: /skip/i }))
    expect(localStorage.getItem("onboardingComplete")).toBe("true")
    expect(mockPush).toHaveBeenCalledWith("/")
  })

  it("navigates back when Back is clicked", () => {
    render(<OnboardingFlow />)
    fireEvent.click(screen.getByRole("button", { name: /next/i })) // welcome -> ranks
    fireEvent.click(screen.getByRole("button", { name: /back/i })) // ranks -> welcome
    expect(screen.getByText(/welcome, operator/i)).toBeInTheDocument()
  })

  it("disables Back on the first step", () => {
    render(<OnboardingFlow />)
    const backBtn = screen.getByRole("button", { name: /back/i }) as HTMLButtonElement
    expect(backBtn.disabled).toBe(true)
  })

  it("shows the Pick Your First Mission step last and links to a mission", () => {
    render(<OnboardingFlow />)
    fireEvent.click(screen.getByRole("button", { name: /next/i })) // welcome
    fireEvent.click(screen.getByRole("button", { name: /next/i })) // ranks
    fireEvent.click(screen.getByRole("button", { name: /next/i })) // streaks
    expect(screen.getByText(/pick your first mission/i)).toBeInTheDocument()
    const links = screen.getAllByRole("link")
    expect(links.length).toBeGreaterThan(0)
    expect(links[0].getAttribute("href")).toMatch(/^\/missions\//)
  })

  it("marks onboarding complete when a mission is picked", () => {
    render(<OnboardingFlow />)
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    const firstLink = screen.getAllByRole("link")[0]
    fireEvent.click(firstLink)
    expect(localStorage.getItem("onboardingComplete")).toBe("true")
  })

  it("displays step progress indicator (1 of 4)", () => {
    render(<OnboardingFlow />)
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
  })

  it("does not navigate when Enter is pressed inside a button", () => {
    render(<OnboardingFlow />)
    const skipBtn = screen.getByRole("button", { name: /skip/i })
    fireEvent.keyDown(skipBtn, { key: "Enter" })
    // Still on step 1 of 4
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
  })
})
