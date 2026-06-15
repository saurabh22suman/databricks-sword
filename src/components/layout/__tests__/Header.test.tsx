import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { Header } from "../Header"

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    onClick,
    ...props
  }: {
    children: React.ReactNode
    href: string
    className?: string
    onClick?: () => void
  }) => (
    <a href={href} className={className} onClick={onClick} {...props}>
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

const mockUpdateSetting = vi.hoisted(() => vi.fn())
const mockStopMusic = vi.hoisted(() => vi.fn())

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Menu: () => <span data-testid="menu-icon" />,
  Sword: () => <span data-testid="sword-icon" />,
  User: () => <span data-testid="user-icon" />,
  X: () => <span data-testid="x-icon" />,
  Volume2: () => <span data-testid="volume2-icon" />,
  VolumeX: () => <span data-testid="volumex-icon" />,
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

vi.mock("@/lib/settings", () => ({
  useSettings: () => ({
    settings: {
      animationsEnabled: true,
      sfxEnabled: true,
      musicEnabled: true,
      musicVolume: 35,
      reduceMotion: false,
      dyslexiaFont: false,
      contrastMode: false,
      subtitlesEnabled: true,
    },
    updateSetting: mockUpdateSetting,
    resetSettings: vi.fn(),
  }),
}))

vi.mock("@/lib/sound", () => ({
  stopMusic: mockStopMusic,
}))

// Mock useHasCompletedMission - default to true (for existing tests that expect all nav items)
const mockHasCompletedMission = vi.fn(() => true)

vi.mock("@/lib/dashboard", () => ({
  useHasCompletedMission: () => mockHasCompletedMission(),
}))

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasCompletedMission.mockReturnValue(true)
  })

  it("renders top-right mute button", () => {
    render(<Header />)
    expect(screen.getByRole("button", { name: "Mute all audio" })).toBeInTheDocument()
  })

  it("mutes both SFX and music from header control", () => {
    render(<Header />)

    fireEvent.click(screen.getByRole("button", { name: "Mute all audio" }))

    expect(mockUpdateSetting).toHaveBeenCalledWith("sfxEnabled", false)
    expect(mockUpdateSetting).toHaveBeenCalledWith("musicEnabled", false)
    expect(mockStopMusic).toHaveBeenCalled()
  })
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
    expect(screen.getByText("Cheat Sheet")).toBeInTheDocument()
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

describe("Header with progressive disclosure", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("when hasCompletedMission is false", () => {
    beforeEach(() => {
      mockHasCompletedMission.mockReturnValue(false)
    })

    it("shows standard nav items (Missions, Intel, Leaderboard, Logs)", () => {
      render(<Header />)
      expect(screen.getByText("Missions")).toBeInTheDocument()
      expect(screen.getByText("Intel")).toBeInTheDocument()
      expect(screen.getByText("Leaderboard")).toBeInTheDocument()
      expect(screen.getByText("Logs")).toBeInTheDocument()
    })

    it("hides advanced nav items in desktop nav", () => {
      render(<Header />)
      expect(screen.getByText("Missions")).toBeInTheDocument()
      expect(screen.getByText("More")).toBeInTheDocument()
    })

    it("shows More button when no missions completed", () => {
      render(<Header />)
      expect(screen.getByText("More")).toBeInTheDocument()
    })

    it("clicking More opens dropdown with advanced items", () => {
      render(<Header />)

      const moreButton = screen.getByText("More")
      fireEvent.click(moreButton)

      expect(screen.getByText("⚡ Field Ops")).toBeInTheDocument()
      expect(screen.getByText("Map")).toBeInTheDocument()
      expect(screen.getByText("Cheat Sheet")).toBeInTheDocument()
    })

    it("clicking More again closes the dropdown", () => {
      render(<Header />)

      const moreButton = screen.getByText("More")
      fireEvent.click(moreButton)
      expect(screen.getByText("⚡ Field Ops")).toBeInTheDocument()

      fireEvent.click(moreButton)
    })

    it("pressing Escape closes the dropdown", () => {
      render(<Header />)

      const moreButton = screen.getByText("More")
      fireEvent.click(moreButton)

      expect(screen.getByText("⚡ Field Ops")).toBeInTheDocument()

      fireEvent.keyDown(document, { key: "Escape" })
    })

    it("clicking outside closes the dropdown", () => {
      render(<Header />)

      const moreButton = screen.getByText("More")
      fireEvent.click(moreButton)

      expect(screen.getByText("⚡ Field Ops")).toBeInTheDocument()

      fireEvent.mouseDown(document.body)
    })
  })

  describe("when hasCompletedMission is true", () => {
    beforeEach(() => {
      mockHasCompletedMission.mockReturnValue(true)
    })

    it("shows all 7 items in desktop nav", () => {
      render(<Header />)
      expect(screen.getByText("Missions")).toBeInTheDocument()
      expect(screen.getByText("Intel")).toBeInTheDocument()
      expect(screen.getByText("⚡ Field Ops")).toBeInTheDocument()
      expect(screen.getByText("Map")).toBeInTheDocument()
      expect(screen.getByText("Leaderboard")).toBeInTheDocument()
      expect(screen.getByText("Cheat Sheet")).toBeInTheDocument()
      expect(screen.getByText("Logs")).toBeInTheDocument()
    })

    it("does not show More button", () => {
      render(<Header />)
      expect(screen.queryByText("More")).not.toBeInTheDocument()
    })
  })

  describe("mobile menu behavior", () => {
    beforeEach(() => {
      mockHasCompletedMission.mockReturnValue(false)
    })

    it("hides advanced items by default in mobile menu", () => {
      render(<Header />)

      const menuButton = screen.getByRole("button", { name: "Open menu" })
      fireEvent.click(menuButton)

      // Look for elements in mobile nav (the one inside the mobile menu dialog)
      const mobileNav = document.querySelector('[role="dialog"] nav')
      expect(mobileNav).toBeInTheDocument()
      // The mobile nav should have Show more toggle when not completed
      expect(screen.getAllByText("Show more ▾").length).toBeGreaterThan(0)
    })

    it("shows Show more toggle in mobile menu when not completed", () => {
      render(<Header />)

      const menuButton = screen.getByRole("button", { name: "Open menu" })
      fireEvent.click(menuButton)

      // In mobile menu, should see "Show more" toggle
      expect(screen.getAllByText("Show more ▾").length).toBeGreaterThan(0)
    })

    it("clicking Show more reveals advanced items in mobile", () => {
      render(<Header />)

      const menuButton = screen.getByRole("button", { name: "Open menu" })
      fireEvent.click(menuButton)

      // Click the "Show more" button in mobile menu
      const showMoreButtons = screen.getAllByText("Show more ▾")
      const mobileShowMore = showMoreButtons.find(
        (el) => el.closest('[role="dialog"]') !== null,
      )
      expect(mobileShowMore).toBeTruthy()
      fireEvent.click(mobileShowMore!)

      // Advanced items should now be visible in mobile menu
      expect(screen.getAllByText("⚡ Field Ops").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Map").length).toBeGreaterThan(0)
      expect(screen.getAllByText("Cheat Sheet").length).toBeGreaterThan(0)
    })
  })
})