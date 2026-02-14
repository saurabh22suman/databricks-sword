import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

// Mock lottie-react to avoid canvas errors in jsdom
vi.mock("lottie-react", () => ({
  __esModule: true,
  default: () => null,
  useLottie: () => ({
    View: null,
    play: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    setSpeed: vi.fn(),
    goToAndStop: vi.fn(),
    goToAndPlay: vi.fn(),
    setDirection: vi.fn(),
    playSegments: vi.fn(),
    setSubframe: vi.fn(),
    getDuration: vi.fn(),
    destroy: vi.fn(),
    animationLoaded: false,
    animationItem: undefined,
  }),
  useLottieInteractivity: () => null,
}))
