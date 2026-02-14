/**
 * Maps achievement icon identifiers to their PNG file paths in /public/achievements/.
 * Used by AchievementCard and AchievementToast to render achievement icons.
 *
 * Icons that don't have a direct match fall back to a closest match.
 */
export const ACHIEVEMENT_ICON_MAP: Record<string, string> = {
  // Direct matches to ach-*.png files
  sword: "/achievements/ach-sword.png",
  fire: "/achievements/ach-fire.png",
  "fire-double": "/achievements/ach-fire-double.png",
  "fire-triple": "/achievements/ach-fire-triple.png",
  trophy: "/achievements/ach-trophy.png",
  scroll: "/achievements/ach-scroll.png",
  brain: "/achievements/ach-brain.png",
  lightning: "/achievements/ach-lightning.png",
  diamond: "/achievements/ach-diamond.png",
  star: "/achievements/ach-star.png",
  stars: "/achievements/ach-stars.png",
  crown: "/achievements/ach-crown.png",
  target: "/achievements/ach-target.png",
  calendar: "/achievements/ach-calendar.png",
  medal: "/achievements/ach-medal.png",
  book: "/achievements/ach-book.png",
  compass: "/achievements/ach-compass.png",
  shield: "/achievements/ach-shield.png",
  atom: "/achievements/ach-atom.png",
  rocket: "/achievements/ach-rocket.png",
  infinity: "/achievements/ach-infinity.png",

  // Achievement icons that map to closest match
  flag: "/achievements/ach-star.png",
  spark: "/achievements/ach-lightning.png",
  database: "/achievements/ach-diamond.png",
  delta: "/achievements/ach-star.png",
  stream: "/achievements/ach-rocket.png",
  flame: "/achievements/ach-fire-double.png",

  // Rank-based achievement icons — use rank badge PNGs
  "badge-operative": "/badges/rank-operative.png",
  "badge-commander": "/badges/rank-commander.png",
  "badge-architect": "/badges/rank-architect.png",
  "badge-grandmaster": "/badges/rank-grandmaster.png",
} as const

/**
 * Returns the icon path for a given achievement icon identifier.
 * Falls back to the sword icon if the identifier is unknown.
 *
 * @param icon - The achievement icon identifier string
 * @returns Path to the PNG file in /public/
 */
export function getAchievementIconPath(icon: string): string {
  return ACHIEVEMENT_ICON_MAP[icon] ?? "/achievements/ach-sword.png"
}
