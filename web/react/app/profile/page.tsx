"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, Calendar, Edit3, LogOut, RefreshCw, Save, Star, Trophy, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AchievementCard } from "@/components/gamification"
import { apiFetch, clearStoredAuth, getStoredAuth, setStoredAuth } from "@/lib/api-client"
import type { Achievement, User, UserStats } from "@/lib/types"
import { offerSlug } from "@/lib/types"
import { initialsFromName, pointsToLevel, pointsToXpWindow } from "@/lib/ui-helpers"

type MeSkill = {
  skill_id: number
  type: string
  proficiency_level: number
  description: string | null
  skill_name: string
  category_name: string | null
}

type MeUser = {
  id: number
  username: string
  email: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  points: number
  teach_count?: number
  learn_count?: number
  completed_calls_count?: number
  created_at?: string | null
  skills: MeSkill[]
}

type UserBadgeRow = {
  id: number
  name: string
  image_url: string | null
  level: number
  awarded_at: string
}

function meToViewUser(me: MeUser, avgRating: number, reviewTotal: number): User {
  const level = pointsToLevel(me.points)
  const { xp, xpToNextLevel } = pointsToXpWindow(me.points)
  const stats: UserStats = {
    level,
    xp,
    xpToNextLevel,
    streak: 0,
    totalExchanges: me.completed_calls_count ?? 0,
    totalHours: 0,
    skillsTaught: me.teach_count ?? 0,
    skillsLearned: me.learn_count ?? 0,
  }
  const names = (me.skills || []).map((s) => s.skill_name)
  return {
    id: String(me.id),
    name: me.full_name?.trim() || me.username,
    avatar: initialsFromName(me.full_name, me.username),
    avatarUrl: me.avatar_url,
    bio: me.bio?.trim() || "",
    location: "",
    skills: [...new Set(names)],
    rating: avgRating,
    stats,
    achievements: [],
    rank: undefined,
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [me, setMe] = useState<MeUser | null>(null)
  const [viewUser, setViewUser] = useState<User | null>(null)
  const [reviews, setReviews] = useState<
    { id: number; reviewer_name: string; rating: number; comment: string | null; created_at: string }[]
  >([])
  const [badges, setBadges] = useState<Achievement[]>([])
  const [profileBadges, setProfileBadges] = useState<UserBadgeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ name: "", bio: "" })

  const load = useCallback(async () => {
    const auth = getStoredAuth()
    if (!auth?.token) {
      setLoading(false)
      router.replace("/auth")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const meRes = await apiFetch<{ user: MeUser }>("/api/users/me", { token: auth.token })
      const u = meRes.user
      setMe(u)
      setEditData({
        name: u.full_name?.trim() || "",
        bio: u.bio?.trim() || "",
      })

      const [revRes, badgeRes] = await Promise.all([
        apiFetch<{ reviews: typeof reviews; average_rating: number; total: number }>(
          `/api/reviews/${u.id}`
        ),
        apiFetch<{ badges: UserBadgeRow[] }>(
          `/api/badges/user/${u.id}`
        ),
      ])
      const revList = revRes.reviews || []
      setReviews(revList)
      const avg = revRes.average_rating || 0

      const ach: Achievement[] = (badgeRes.badges || []).map((b) => ({
        id: String(b.id),
        title: b.name,
        description: `Уровень ${b.level}`,
        icon: "star",
        unlockedAt: b.awarded_at,
      }))
      setBadges(ach)
      setProfileBadges(badgeRes.badges || [])

      const vu = meToViewUser(u, avg, revRes.total || 0)
      vu.achievements = ach
      setViewUser(vu)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  async function handleLogout() {
    const auth = getStoredAuth()
    if (auth?.token) {
      try {
        await apiFetch("/api/auth/logout", { method: "POST", token: auth.token })
      } catch {
        /* ignore */
      }
    }
    clearStoredAuth()
    router.push("/")
    router.refresh()
  }

  async function handleSave() {
    const auth = getStoredAuth()
    if (!auth?.token || !me) return
    try {
      const res = await apiFetch<{ user: MeUser }>("/api/users/me", {
        method: "PUT",
        token: auth.token,
        body: JSON.stringify({
          full_name: editData.name.trim(),
          bio: editData.bio.trim(),
        }),
      })
      setStoredAuth({ token: auth.token, user: { ...auth.user, ...res.user } })
      setIsEditing(false)
      await load()
    } catch {
      /* toast optional */
    }
  }

  if (loading || (!viewUser && !error)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
        Загрузка профиля…
      </div>
    )
  }

  if (error || !viewUser || !me) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-destructive">{error || "Нет данных"}</p>
        <Button asChild className="mt-4">
          <Link href="/auth">Войти</Link>
        </Button>
      </div>
    )
  }

  const currentUser = viewUser
  const teachSkills = (me.skills || []).filter((s) => s.type === "teach")
  const monthsOnPlatform = (() => {
    if (!me.created_at) return "—"
    const created = new Date(String(me.created_at).replace(" ", "T") + "Z")
    if (Number.isNaN(created.getTime())) return "—"
    const now = new Date()
    const months = Math.max(
      0,
      (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth())
    )
    return `${Math.max(1, months)} мес.`
  })()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative">
                <Avatar className="size-20 md:size-24">
                  <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary md:text-2xl">
                    {currentUser.avatar}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <Label htmlFor="edit-name" className="text-xs text-muted-foreground">
                        Имя
                      </Label>
                      <Input
                        id="edit-name"
                        value={editData.name}
                        onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold text-foreground">{currentUser.name}</h1>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="size-4 fill-primary text-primary" />
                        <span className="font-semibold text-foreground">{currentUser.rating || "—"}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{reviews.length} отзывов</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsEditing(false)}>
                    <X className="size-3.5" />
                    Отмена
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => void handleSave()}>
                    <Save className="size-3.5" />
                    Сохранить
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsEditing(true)}>
                    <Edit3 className="size-3.5" />
                    Редактировать
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void handleLogout()}>
                    <LogOut className="size-3.5" />
                    Выйти
                  </Button>
                </>
              )}
            </div>
          </div>

          <Separator className="my-5" />

          {isEditing ? (
            <div>
              <Label htmlFor="edit-bio" className="text-xs text-muted-foreground">
                О себе
              </Label>
              <Textarea
                id="edit-bio"
                value={editData.bio}
                onChange={(e) => setEditData((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                className="mt-1"
              />
            </div>
          ) : (
            <p className="leading-relaxed text-muted-foreground">
              {currentUser.bio || "Добавьте описание в профиле."}
            </p>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium text-foreground">Навыки в профиле:</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currentUser.skills.length === 0 ? (
                <span className="text-sm text-muted-foreground">Пока не указаны</span>
              ) : (
                currentUser.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-foreground">Достижения:</p>
            {profileBadges.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Пока нет бейджей</p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {profileBadges.map((b, i) => (
                  <div
                    key={b.id}
                    className={`rounded-xl p-3 text-center ${
                      i % 4 === 0
                        ? "bg-slate-100"
                        : i % 4 === 1
                          ? "bg-emerald-100"
                          : i % 4 === 2
                            ? "bg-indigo-100"
                            : "bg-amber-100"
                    }`}
                  >
                    {b.image_url ? (
                      <img
                        src={b.image_url}
                        alt={b.name}
                        className="mx-auto mb-1 h-5 w-5 object-contain"
                      />
                    ) : (
                      <Trophy className="mx-auto mb-1 size-5 text-emerald-600" />
                    )}
                    <p className="text-xs font-semibold text-foreground">{b.name}</p>
                    <p className="text-[11px] text-muted-foreground">Уровень {b.level}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <RefreshCw className="mx-auto size-5 text-primary" />
              <p className="mt-2 text-2xl font-bold text-foreground">{me.completed_calls_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Обменов</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="mx-auto size-5 text-primary" />
              <p className="mt-2 text-2xl font-bold text-foreground">{currentUser.skills.length}</p>
              <p className="text-xs text-muted-foreground">Навыков</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="mx-auto size-5 text-primary" />
              <p className="mt-2 text-2xl font-bold text-foreground">{currentUser.rating || "—"}</p>
              <p className="text-xs text-muted-foreground">Рейтинг</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="mx-auto size-5 text-primary" />
              <p className="mt-2 text-2xl font-bold text-foreground">{monthsOnPlatform}</p>
              <p className="text-xs text-muted-foreground">На платформе</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Tabs defaultValue="skills">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="skills" className="gap-1.5">
                <BookOpen className="size-3.5" />
                Навыки
              </TabsTrigger>
              <TabsTrigger value="exchanges" className="gap-1.5">
                <RefreshCw className="size-3.5" />
                Обмены
              </TabsTrigger>
              <TabsTrigger value="achievements" className="gap-1.5">
                <Trophy className="size-3.5" />
                Бейджи
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5">
                <Star className="size-3.5" />
                Отзывы
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="skills">
                {teachSkills.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                      <BookOpen className="size-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Добавьте навыки через API или веб-админку</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4">
                    {teachSkills.map((s) => (
                      <Link key={s.skill_id} href={`/skills/${offerSlug(me.id, s.skill_id)}`}>
                        <Card className="transition-colors hover:border-primary/30">
                          <CardContent className="flex items-center justify-between p-5">
                            <div>
                              <h3 className="font-semibold text-foreground">{s.skill_name}</h3>
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {s.category_name || "Категория"}
                              </Badge>
                              {s.description && (
                                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="exchanges">
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    История обменов будет здесь, когда появится соответствующий раздел API.
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="achievements">
                <div className="grid gap-3 sm:grid-cols-2">
                  {badges.length === 0 ? (
                    <p className="text-muted-foreground">Пока нет бейджей</p>
                  ) : (
                    badges.map((a) => <AchievementCard key={a.id} achievement={a} />)
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="flex flex-col gap-4">
                  {reviews.length === 0 ? (
                    <p className="text-muted-foreground">Отзывов пока нет</p>
                  ) : (
                    reviews.map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <p className="font-medium text-foreground">{review.reviewer_name}</p>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`size-3.5 ${
                                    i < review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
                          )}
                          <p className="mt-2 text-xs text-muted-foreground">{review.created_at}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </div>
        </Tabs>
      </div>
    </div>
  )
}
