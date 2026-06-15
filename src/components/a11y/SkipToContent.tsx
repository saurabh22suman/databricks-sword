/**
 * @file SkipToContent.tsx
 * @description Visually hidden link that becomes visible on focus. Lets
 * keyboard users bypass the header navigation and jump directly to the
 * main content. Pair with a `<main id="main-content" tabIndex={-1}>` element.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-anime-accent focus:text-anime-950 focus:font-mono focus:font-bold focus:shadow-[0_0_20px_rgba(255,42,109,0.6)]"
    >
      Skip to main content
    </a>
  )
}
