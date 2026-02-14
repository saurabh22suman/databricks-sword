import type { Rank } from "./types"

/**
 * Rank System Implementation
 * 
 * 8 Military/Mecha-inspired ranks with XP thresholds and helper functions.
 * Ranks: Cadet → Recruit → Operative → Specialist → Commander → Sentinel → Architect → Grandmaster
 */

/**
 * All available ranks in ascending XP order.
 * Immutable array of rank definitions with badge images and descriptions.
 */
export const RANKS: readonly Rank[] = [
  {
    id: "cadet", 
    title: "Cadet", 
    minXp: 0, 
    icon: "cadet",
    badge: {
      src: "/badges/rank-cadet.png",
      alt: "Cadet Badge - Raw gray steel chevron with faint cyan edge",
    },
    description: "A simple, glowing blue star on a circular badge, representing a new beginning."
  },
  {
    id: "recruit", 
    title: "Recruit", 
    minXp: 100, 
    icon: "recruit",
    badge: {
      src: "/badges/rank-recruit.png",
      alt: "Recruit Badge - Filled shield with faint cyan neon border",
    },
    description: "Two interlocking gears and two stars, symbolizing the start of training and teamwork."
  },
  {
    id: "operative", 
    title: "Operative", 
    minXp: 500, 
    icon: "operative",
    badge: {
      src: "/badges/rank-operative.png",
      alt: "Operative Badge - Hexagonal badge with circuit traces and cyan glow",
    },
    description: "A triangular badge featuring a blade, a microchip, and a gear, indicating a skilled, action-oriented role."
  },
  {
    id: "specialist", 
    title: "Specialist", 
    minXp: 1500, 
    icon: "specialist",
    badge: {
      src: "/badges/rank-specialist.png",
      alt: "Specialist Badge - Diamond with crosshair and cyan-purple glow",
    },
    description: "A diamond-shaped badge with a central glowing eye and data lines, representing expertise and focused knowledge."
  },
  {
    id: "commander", 
    title: "Commander", 
    minXp: 4000, 
    icon: "commander",
    badge: {
      src: "/badges/rank-commander.png",
      alt: "Commander Badge - Winged insignia with purple and red glow",
    },
    description: "A shield-shaped badge with a central glowing red crown and five stars, symbolizing leadership and authority."
  },
  {
    id: "sentinel", 
    title: "Sentinel", 
    minXp: 8000, 
    icon: "sentinel",
    badge: {
      src: "/badges/rank-sentinel.png",
      alt: "Sentinel Badge - Energy shield with red neon glow",
    },
    description: "A more fortified shield with a watchful blue eye and six points, representing a powerful guardian."
  },
  {
    id: "architect", 
    title: "Architect", 
    minXp: 15000, 
    icon: "architect",
    badge: {
      src: "/badges/rank-architect.png",
      alt: "Architect Badge - Geometric hexagons with gold metallic sheen",
    },
    description: "A complex, multi-layered badge resembling a glowing blueprint with a compass, symbolizing planning and creation."
  },
  {
    id: "grandmaster", 
    title: "Grandmaster", 
    minXp: 25000, 
    icon: "grandmaster",
    badge: {
      src: "/badges/rank-grandmaster.png",
      alt: "Grandmaster Badge - Crown and katana with holographic prismatic glow",
    },
    description: "The most elaborate badge, featuring a glowing cosmic emblem and an infinity symbol, representing the pinnacle of achievement and power."
  },
] as const

/**
 * Returns the appropriate rank for a given XP amount.
 * 
 * @param xp - Total XP earned by the user
 * @returns The rank corresponding to the XP amount
 * 
 * @example
 * ```ts
 * getRankForXp(0)    // { id: "cadet", ... }
 * getRankForXp(750)  // { id: "operative", ... }
 * getRankForXp(50000) // { id: "grandmaster", ... }
 * ```
 */
export function getRankForXp(xp: number): Rank {
  // Handle negative XP
  if (xp < 0) {
    return RANKS[0]
  }

  // Find the highest rank the user qualifies for
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXp) {
      return RANKS[i]
    }
  }

  // Fallback to lowest rank (should never reach here)
  return RANKS[0]
}

/**
 * Returns the next rank after the given rank, or null if at max rank.
 * 
 * @param currentRank - The current rank
 * @returns The next rank, or null if already at Grandmaster
 * 
 * @example
 * ```ts
 * getNextRank(RANKS[0]) // RANKS[1] (Recruit)
 * getNextRank(RANKS[7]) // null (already Grandmaster)
 * ```
 */
export function getNextRank(currentRank: Rank): Rank | null {
  const currentIndex = RANKS.findIndex((r) => r.id === currentRank.id)
  
  // If not found or at max rank, return null
  if (currentIndex === -1 || currentIndex === RANKS.length - 1) {
    return null
  }

  return RANKS[currentIndex + 1]
}

/**
 * Calculates XP needed to reach the next rank.
 * 
 * @param xp - Current total XP
 * @returns XP needed to reach next rank, or 0 if at max rank
 * 
 * @example
 * ```ts
 * getXpToNextRank(0)   // 100 (need 100 more for Recruit)
 * getXpToNextRank(50)  // 50  (need 50 more for Recruit)
 * getXpToNextRank(30000) // 0  (already at max rank)
 * ```
 */
export function getXpToNextRank(xp: number): number {
  const currentRank = getRankForXp(xp)
  const nextRank = getNextRank(currentRank)

  // If at max rank, no more XP needed
  if (!nextRank) {
    return 0
  }

  return nextRank.minXp - xp
}

/**
 * Calculates progress percentage within the current rank (0-100).
 * 
 * @param xp - Current total XP
 * @returns Progress percentage (0-100) within current rank
 * 
 * @example
 * ```ts
 * getRankProgress(0)    // 0   (at start of Cadet)
 * getRankProgress(50)   // 50  (halfway through Cadet)
 * getRankProgress(100)  // 0   (at start of Recruit)
 * getRankProgress(30000) // 100 (at max rank)
 * ```
 */
export function getRankProgress(xp: number): number {
  // Handle negative XP
  if (xp < 0) {
    return 0
  }

  const currentRank = getRankForXp(xp)
  const nextRank = getNextRank(currentRank)

  // If at max rank, return 100%
  if (!nextRank) {
    return 100
  }

  // Calculate progress within current rank
  const xpIntoRank = xp - currentRank.minXp
  const xpNeededForRank = nextRank.minXp - currentRank.minXp
  const progress = (xpIntoRank / xpNeededForRank) * 100

  return Math.floor(progress)
}
