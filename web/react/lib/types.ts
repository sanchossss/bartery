import type { SkillLevel } from "@/lib/ui-helpers"

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: string
  progress?: number
  maxProgress?: number
}

export interface UserStats {
  level: number
  xp: number
  xpToNextLevel: number
  streak: number
  totalExchanges: number
  totalHours: number
  skillsTaught: number
  skillsLearned: number
}

/** UI user slice (profile / leaderboard). */
export interface User {
  id: string
  name: string
  avatar: string
  avatarUrl: string | null
  bio: string
  location: string
  skills: string[]
  rating: number
  stats: UserStats
  achievements: Achievement[]
  rank?: number
}

export interface Skill {
  id: string
  title: string
  category: string
  description: string
  longDescription: string
  level: SkillLevel
  rating: number
  reviewCount: number
  exchangeCount: number
  tags: string[]
  user: User
  userId: number
  skillId: number
  exchangeType: "teach" | "learn"
}

export interface Message {
  id: string
  senderId: string
  text: string
  timestamp: string
}

export interface Chat {
  id: string
  participant: User
  lastMessage: string
  lastMessageTime: string
  unread: number
  messages: Message[]
}

export interface TeachOfferRow {
  user_id: number
  skill_id: number
  offer_type: "teach" | "learn"
  proficiency_level: number
  offer_description: string | null
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  skill_name: string
  skill_description: string | null
  category_id: number | null
  category_name: string | null
  teacher_avg_rating: number | null
  teacher_review_count: number
}

export function offerSlug(userId: number, skillId: number): string {
  return `${userId}-${skillId}`
}

export function parseOfferSlug(slug: string): { userId: number; skillId: number } | null {
  const m = /^(\d+)-(\d+)$/.exec(slug.trim())
  if (!m) return null
  return { userId: Number(m[1]), skillId: Number(m[2]) }
}
