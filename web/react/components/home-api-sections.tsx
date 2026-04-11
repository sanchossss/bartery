"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  Crown,
  Flame,
  RefreshCw,
  Search,
  Star,
  Trophy,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { apiFetch } from "@/lib/api-client"
import { teachOfferToSkill } from "@/lib/mappers"
import type { Skill } from "@/lib/types"
import type { TeachOfferRow } from "@/lib/types"
import { getUserLevelTitle, initialsFromName, pointsToLevel, pointsToXpWindow } from "@/lib/ui-helpers"

type CategoryRow = { id: number; name: string; description: string | null }
type LeaderRow = {
  id: number
  username: string
  full_name: string | null
  avatar_url: string | null
  points: number
}

export function PopularSkillsSection() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiFetch<{ offers: TeachOfferRow[] }>("/api/teach-offers?limit=12")
        if (cancelled) return
        setSkills((data.offers || []).slice(0, 4).map(teachOfferToSkill))
      } catch {
        if (!cancelled) setSkills([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <section className="bg-card py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center text-muted-foreground">
          Загрузка навыков…
        </div>
      </section>
    )
  }

  if (skills.length === 0) {
    return (
      <section className="bg-card py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center text-muted-foreground">
          Пока нет предложений в каталоге. Зарегистрируйтесь и добавьте навыки, которые готовы преподавать.
        </div>
      </section>
    )
  }

  return (
    <section className="bg-card py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Популярные навыки
            </h2>
            <p className="mt-3 text-muted-foreground">
              Актуальные предложения от участников
            </p>
          </div>
          <Button variant="ghost" asChild className="hidden gap-1 sm:flex">
            <Link href="/skills">
              Все навыки
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {skills.map((skill) => (
            <Link key={skill.id} href={`/skills/${skill.id}`}>
              <Card className="h-full transition-colors hover:border-primary/30">
                <CardContent className="flex h-full flex-col p-5">
                  <Badge variant="secondary" className="w-fit text-xs">
                    {skill.category}
                  </Badge>
                  <h3 className="mt-3 font-semibold text-foreground">{skill.title}</h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {skill.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                        {skill.user.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{skill.user.name}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1">
                    <Star className="size-3.5 fill-primary text-primary" />
                    <span className="text-sm font-medium text-foreground">{skill.rating || "—"}</span>
                    <span className="text-xs text-muted-foreground">
                      ({skill.reviewCount})
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Button variant="outline" asChild className="gap-1">
            <Link href="/skills">
              Все навыки
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

const categoryIcons: Record<string, string> = {
  Программирование: "{}",
  Языки: "Aa",
  Дизайн: "UI",
  Музыка: "M",
  Спорт: "S",
  Бизнес: "B",
  Кулинария: "K",
  Фотография: "F",
}

export function CategoriesSectionDynamic() {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiFetch<{ categories: CategoryRow[] }>("/api/categories")
        if (cancelled) return
        setCategories(data.categories || [])
      } catch {
        if (!cancelled) setCategories([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center text-muted-foreground">
          Загрузка категорий…
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Категории навыков
          </h2>
          <p className="mt-3 text-muted-foreground">Найдите то, что вам интересно</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/skills?category=${encodeURIComponent(cat.name)}`}
            >
              <Card className="transition-colors hover:border-primary/30">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
                    {categoryIcons[cat.name] || cat.name[0]}
                  </div>
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LeaderboardSectionDynamic() {
  const [rows, setRows] = useState<LeaderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiFetch<{ users: LeaderRow[] }>("/api/leaderboard?limit=5")
        if (cancelled) return
        setRows(data.users || [])
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const rankColors = ["text-yellow-500", "text-gray-400", "text-amber-600"]

  if (loading) {
    return (
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center text-muted-foreground">
          Загрузка лидерборда…
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Trophy className="size-6 text-primary" />
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">Лидерборд</h2>
          <p className="mt-3 text-muted-foreground">По очкам активности на платформе</p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {rows.length === 0 ? (
                <div className="px-5 py-8 text-center text-muted-foreground">
                  Пока нет данных
                </div>
              ) : (
                rows.map((user, i) => {
                  const level = pointsToLevel(user.points)
                  const { xp, xpToNextLevel } = pointsToXpWindow(user.points)
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                    >
                      <span
                        className={`w-8 text-center text-lg font-bold ${
                          i < 3 ? rankColors[i] : "text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initialsFromName(user.full_name, user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {user.full_name?.trim() || user.username}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Crown className="size-3 text-primary" />
                            Ур. {level} {getUserLevelTitle(level)}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="flex items-center gap-1 text-orange-500">
                            <Flame className="size-3" />
                            {user.points} pts
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{xp.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          / {xpToNextLevel.toLocaleString()} XP
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

export function StatsSectionDynamic() {
  const [totals, setTotals] = useState<{ users: number; offers: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [lb, off] = await Promise.all([
          apiFetch<{ total_users: number }>("/api/leaderboard?limit=1"),
          apiFetch<{ offers: unknown[] }>("/api/teach-offers?limit=200"),
        ])
        if (cancelled) return
        setTotals({
          users: lb.total_users ?? 0,
          offers: (off.offers || []).length,
        })
      } catch {
        if (!cancelled) setTotals(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = [
    {
      value: totals ? `${totals.users}` : "—",
      label: "Пользователей",
      icon: Users,
    },
    {
      value: totals ? `${totals.offers}` : "—",
      label: "Предложений «преподаю»",
      icon: BookOpen,
    },
    { value: "—", label: "Обменов", icon: RefreshCw },
    { value: "4.8", label: "Средний рейтинг", icon: Star },
  ]

  return (
    <section className="bg-card py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <s.icon className="mx-auto size-6 text-primary" />
              <p className="mt-3 text-3xl font-bold text-foreground">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
