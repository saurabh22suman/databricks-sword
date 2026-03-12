import { fireEvent, render, screen } from "@testing-library/react"
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

describe("Header", () => {
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
