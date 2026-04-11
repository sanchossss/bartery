/**
 * @deprecated Use @/lib/types and @/lib/ui-helpers. Kept for gradual migration of import paths.
 */
export type {
  Skill,
  User,
  UserStats,
  Achievement,
  Message,
  Chat,
  TeachOfferRow,
} from "@/lib/types"
export { offerSlug, parseOfferSlug } from "@/lib/types"
export {
  getLevelLabel,
  getUserLevelTitle,
  proficiencyToLevel,
  pointsToLevel,
  pointsToXpWindow,
  initialsFromName,
} from "@/lib/ui-helpers"
export type { SkillLevel } from "@/lib/ui-helpers"
