export type SkillLevel = "beginner" | "intermediate" | "advanced"

export function proficiencyToLevel(proficiency: number): SkillLevel {
  if (proficiency <= 2) return "beginner"
  if (proficiency <= 3) return "intermediate"
  return "advanced"
}

export function getLevelLabel(level: SkillLevel): string {
  switch (level) {
    case "beginner":
      return "Начинающий"
    case "intermediate":
      return "Средний"
    case "advanced":
      return "Продвинутый"
  }
}

/** Derive display level from platform points (no separate XP table in API). */
export function pointsToLevel(points: number): number {
  const p = Math.max(0, points)
  return Math.min(20, 1 + Math.floor(Math.sqrt(p / 25)))
}

export function getUserLevelTitle(level: number): string {
  if (level >= 15) return "Легенда"
  if (level >= 12) return "Эксперт"
  if (level >= 9) return "Мастер"
  if (level >= 6) return "Профи"
  if (level >= 3) return "Ученик"
  return "Новичок"
}

/** Fake XP bar upper bound from points (UI only). */
export function pointsToXpWindow(points: number): { xp: number; xpToNextLevel: number } {
  const level = pointsToLevel(points)
  const low = (level - 1) ** 2 * 25
  const high = level ** 2 * 25
  return { xp: points - low, xpToNextLevel: Math.max(high - low, 1) }
}

export function initialsFromName(name: string | null | undefined, username?: string | null): string {
  const s = (name || username || "?").trim()
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase() || "?"
}
