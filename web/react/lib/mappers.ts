import { initialsFromName, proficiencyToLevel, pointsToLevel, pointsToXpWindow } from "@/lib/ui-helpers"
import type { Skill, User, UserStats } from "@/lib/types"
import { offerSlug, type TeachOfferRow } from "@/lib/types"

function rowToTeacherUser(row: TeachOfferRow): User {
  const points = 0
  const level = pointsToLevel(points)
  const { xp, xpToNextLevel } = pointsToXpWindow(points)
  const stats: UserStats = {
    level,
    xp,
    xpToNextLevel,
    streak: 0,
    totalExchanges: 0,
    totalHours: 0,
    skillsTaught: 0,
    skillsLearned: 0,
  }
  return {
    id: String(row.user_id),
    name: row.full_name?.trim() || row.username,
    avatar: initialsFromName(row.full_name, row.username),
    avatarUrl: row.avatar_url,
    bio: row.bio?.trim() || "",
    location: "",
    skills: [],
    rating: row.teacher_avg_rating ?? 0,
    stats,
    achievements: [],
  }
}

export function teachOfferToSkill(row: TeachOfferRow): Skill {
  const user = rowToTeacherUser(row)
  const desc =
    (row.offer_description && row.offer_description.trim()) ||
    (row.skill_description && row.skill_description.trim()) ||
    ""
  const rating = row.teacher_avg_rating ?? 0
  return {
    id: offerSlug(row.user_id, row.skill_id),
    title: row.skill_name,
    category: row.category_name || "Другое",
    description: desc.slice(0, 220) || row.skill_name,
    longDescription: desc || row.skill_name,
    level: proficiencyToLevel(Number(row.proficiency_level) || 1),
    rating,
    reviewCount: row.teacher_review_count,
    exchangeCount: 0,
    tags: [row.skill_name, row.category_name || ""].filter(Boolean),
    user,
    userId: row.user_id,
    skillId: row.skill_id,
    exchangeType: row.offer_type,
  }
}
