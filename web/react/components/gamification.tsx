"use client"

import {
  BookOpen,
  Clock,
  Crown,
  Flame,
  Globe,
  GraduationCap,
  Rocket,
  Star,
  Trophy,
  Zap,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import type { Achievement, User, UserStats } from "@/lib/types"
import { getUserLevelTitle, pointsToLevel, pointsToXpWindow } from "@/lib/ui-helpers"
import { initialsFromName } from "@/lib/ui-helpers"

export type LeaderboardRow = {
  id: number
  username: string
  full_name: string | null
  avatar_url: string | null
  points: number
}
import { cn } from "@/lib/utils"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  rocket: Rocket,
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  star: Star,
  flame: Flame,
  zap: Zap,
  crown: Crown,
  globe: Globe,
  trophy: Trophy,
  clock: Clock,
}

export function LevelBadge({ level, size = "md" }: { level: number; size?: "sm" | "md" | "lg" }) {
  const title = getUserLevelTitle(level)
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  }

  return (
    <Badge
      className={cn(
        "gap-1.5 bg-primary/15 text-primary hover:bg-primary/20",
        sizeClasses[size]
      )}
    >
      <Crown className={cn(size === "sm" ? "size-3" : size === "md" ? "size-3.5" : "size-4")} />
      Ур. {level} {title}
    </Badge>
  )
}

export function XpProgressBar({ stats }: { stats: UserStats }) {
  const progress = (stats.xp / stats.xpToNextLevel) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Опыт до следующего уровня</span>
        <span className="font-medium text-foreground">
          {stats.xp.toLocaleString()} / {stats.xpToNextLevel.toLocaleString()} XP
        </span>
      </div>
      <Progress value={progress} className="h-2.5" />
    </div>
  )
}

export function StreakDisplay({ streak }: { streak: number }) {
  const isActive = streak > 0

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2",
        isActive ? "bg-orange-500/10" : "bg-muted"
      )}
    >
      <Flame
        className={cn(
          "size-5",
          isActive ? "fill-orange-500 text-orange-500" : "text-muted-foreground"
        )}
      />
      <div>
        <p className={cn("text-sm font-semibold", isActive ? "text-orange-600" : "text-muted-foreground")}>
          {streak > 0 ? `${streak} дней подряд` : "Нет серии"}
        </p>
        <p className="text-xs text-muted-foreground">
          {isActive ? "Продолжайте в том же духе!" : "Совершите обмен, чтобы начать"}
        </p>
      </div>
    </div>
  )
}

export function AchievementCard({ achievement, compact = false }: { achievement: Achievement; compact?: boolean }) {
  const Icon = iconMap[achievement.icon] || Star
  const isUnlocked = !!achievement.unlockedAt
  const hasProgress = !isUnlocked && achievement.progress !== undefined

  if (compact) {
    return (
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl transition-colors",
          isUnlocked
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground"
        )}
        title={`${achievement.title}: ${achievement.description}`}
      >
        <Icon className="size-5" />
      </div>
    )
  }

  return (
    <Card className={cn(!isUnlocked && "opacity-60")}>
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            isUnlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{achievement.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{achievement.description}</p>
          {isUnlocked && (
            <p className="mt-1 text-xs text-primary">{achievement.unlockedAt}</p>
          )}
          {hasProgress && (
            <div className="mt-2">
              <Progress
                value={(achievement.progress! / achievement.maxProgress!) * 100}
                className="h-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {achievement.progress} / {achievement.maxProgress}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function GamificationStats({ stats }: { stats: UserStats }) {
  const items = [
    { icon: Flame, label: "Серия", value: `${stats.streak} дн.`, highlight: stats.streak >= 7 },
    { icon: Clock, label: "Часов", value: stats.totalHours },
    { icon: GraduationCap, label: "Обучил", value: stats.skillsTaught },
    { icon: BookOpen, label: "Изучил", value: stats.skillsLearned },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
            <item.icon
              className={cn(
                "size-5",
                item.highlight ? "text-orange-500" : "text-primary"
              )}
            />
            <span className="text-2xl font-bold text-foreground">{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function LeaderboardCard({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[]
  currentUserId?: number
}) {
  const topUsers = rows.slice(0, 5)

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <h3 className="font-semibold text-foreground">Лидерборд</h3>
          </div>
          <Badge variant="secondary" className="text-xs">Топ-5</Badge>
        </div>
        <div className="divide-y divide-border">
          {topUsers.map((user, i) => {
            const isCurrentUser = user.id === currentUserId
            const rankColors = ["text-yellow-500", "text-gray-400", "text-amber-600"]
            const level = pointsToLevel(user.points)
            const { xp, xpToNextLevel } = pointsToXpWindow(user.points)

            return (
              <div
                key={user.id}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 transition-colors",
                  isCurrentUser && "bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "w-6 text-center text-sm font-bold",
                    i < 3 ? rankColors[i] : "text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <Avatar className="size-8">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-semibold",
                      isCurrentUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    )}
                  >
                    {initialsFromName(user.full_name, user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-medium", isCurrentUser && "text-primary")}>
                    {user.full_name?.trim() || user.username}
                    {isCurrentUser && <span className="ml-1 text-xs">(вы)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ур. {level} {getUserLevelTitle(level)} · {user.points} pts
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {xp.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    / {xpToNextLevel.toLocaleString()} XP
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
