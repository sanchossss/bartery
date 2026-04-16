"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, Calendar, Edit3, LogOut, RefreshCw, Save, Star, Trophy, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch, clearStoredAuth, getStoredAuth, setStoredAuth } from "@/lib/api-client"
import type { User, UserStats } from "@/lib/types"
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

type ConversationRow = {
  id: number
  username: string
  full_name: string | null
  last_message: string | null
  unread: number
}

type ConversationMessageRow = {
  id: number
  sender_id: number
  receiver_id: number
  content: string
}

function meToViewUser(me: MeUser, avgRating: number): User {
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
  const [profileBadges, setProfileBadges] = useState<UserBadgeRow[]>([])
  const [incomingLearnSkillIds, setIncomingLearnSkillIds] = useState<Set<number>>(new Set())
  const [incomingMessagesCountBySkillId, setIncomingMessagesCountBySkillId] = useState<Record<number, number>>({})
  const [peerIdsBySkillId, setPeerIdsBySkillId] = useState<Record<number, number[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ name: "", bio: "" })
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

      const [revRes, badgeRes, convRes] = await Promise.all([
        apiFetch<{ reviews: typeof reviews; average_rating: number; total: number }>(
          `/api/reviews/${u.id}`
        ),
        apiFetch<{ badges: UserBadgeRow[] }>(
          `/api/badges/user/${u.id}`
        ),
        apiFetch<{ conversations: ConversationRow[] }>("/api/messages", { token: auth.token }),
      ])
      const revList = revRes.reviews || []
      setReviews(revList)
      const avg = revRes.average_rating || 0

      setProfileBadges(badgeRes.badges || [])
      const conversations = convRes.conversations || []

      const vu = meToViewUser(u, avg)
      setViewUser(vu)

      const learnSkills = (u.skills || []).filter((s) => s.type === "learn")
      if (learnSkills.length === 0 || conversations.length === 0) {
        setIncomingLearnSkillIds(new Set())
        setIncomingMessagesCountBySkillId({})
        setPeerIdsBySkillId({})
        return
      }

      const threads = await Promise.all(
        conversations.map(async (c) => {
          try {
            const res = await apiFetch<{ messages: ConversationMessageRow[] }>(`/api/messages/${c.id}`, {
              token: auth.token,
            })
            return { peerId: c.id, messages: res.messages || [] }
          } catch {
            return { peerId: c.id, messages: [] as ConversationMessageRow[] }
          }
        })
      )

      const matchedIds = new Set<number>()
      const matchedCounts: Record<number, number> = {}
      const matchedPeerIds: Record<number, Set<number>> = {}
      const incomingMessages = threads.flatMap((t) =>
        t.messages
          .filter((m) => m.sender_id !== u.id)
          .map((m) => ({ ...m, peerId: t.peerId }))
      )
      for (const msg of incomingMessages) {
        const text = (msg.content || "").toLowerCase()
        for (const skill of learnSkills) {
          const skillName = skill.skill_name.toLowerCase()
          if (skillName && text.includes(skillName)) {
            matchedIds.add(skill.skill_id)
            matchedCounts[skill.skill_id] = (matchedCounts[skill.skill_id] || 0) + 1
            if (!matchedPeerIds[skill.skill_id]) matchedPeerIds[skill.skill_id] = new Set<number>()
            matchedPeerIds[skill.skill_id].add(msg.peerId)
          }
        }
      }

      // Fallback: if incoming messages exist but no explicit skill mention found,
      // surface all "learn" skills so user still sees actionable exchange intents.
      if (incomingMessages.length > 0 && matchedIds.size === 0) {
        const allPeers = Array.from(new Set(incomingMessages.map((m) => m.peerId)))
        for (const skill of learnSkills) {
          matchedIds.add(skill.skill_id)
          matchedCounts[skill.skill_id] = incomingMessages.length
          matchedPeerIds[skill.skill_id] = new Set(allPeers)
        }
      }

      setIncomingLearnSkillIds(matchedIds)
      setIncomingMessagesCountBySkillId(matchedCounts)
      setPeerIdsBySkillId(
        Object.fromEntries(
          Object.entries(matchedPeerIds).map(([skillId, peers]) => [Number(skillId), Array.from(peers)])
        )
      )
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

  async function handleAvatarPick(file: File | null) {
    const auth = getStoredAuth()
    if (!auth?.token || !file) return

    setAvatarError(null)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Файл слишком большой (макс. 2MB).")
      return
    }

    setAvatarUploading(true)
    try {
      await apiFetch("/api/users/me/avatar", {
        method: "POST",
        token: auth.token,
        // backend expects multipart form with field name `avatar`
        body: (() => {
          const fd = new FormData()
          fd.append("avatar", file)
          return fd
        })(),
      })
      await load()
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Не удалось загрузить фото")
    } finally {
      setAvatarUploading(false)
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
  const mySkills = me.skills || []
  const exchangeSkills = mySkills.filter(
    (s) => s.type === "learn" && incomingLearnSkillIds.has(s.skill_id)
  )
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
                  <Avatar
                    className="size-20 cursor-pointer md:size-24"
                    role="button"
                    tabIndex={0}
                    aria-label="Загрузить фото профиля"
                    onClick={() => fileInputRef.current?.click()}
                  >
                  {currentUser.avatarUrl && <AvatarImage src={currentUser.avatarUrl} alt="avatar" />}
                  <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary md:text-2xl">
                    {currentUser.avatar}
                  </AvatarFallback>
                </Avatar>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleAvatarPick(e.target.files?.[0] ?? null)}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-background/95"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  <Edit3 className="size-4" />
                  <span className="sr-only">Загрузить фото</span>
                </Button>
              </div>
                {avatarError && <p className="mt-2 w-24 text-xs text-destructive">{avatarError}</p>}
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

          <Button className="mt-4 w-full sm:w-auto" asChild>
            <Link href="/profile/add-skill">Добавить навык</Link>
          </Button>

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
              <TabsTrigger value="reviews" className="gap-1.5">
                <Star className="size-3.5" />
                Отзывы
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="skills">
                {mySkills.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                      <BookOpen className="size-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Добавьте навыки через API или веб-админку</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4">
                    {mySkills.map((s) => (
                      <Link key={s.skill_id} href={`/skills/${offerSlug(me.id, s.skill_id)}`}>
                        <Card className="transition-colors hover:border-primary/30">
                          <CardContent className="flex items-center justify-between p-5">
                            <div>
                              <h3 className="font-semibold text-foreground">{s.skill_name}</h3>
                              <Badge variant="secondary" className="mt-1 text-xs">
                                {s.category_name || "Категория"}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`mt-1 ml-2 text-xs ${
                                  s.type === "teach"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-blue-200 bg-blue-50 text-blue-700"
                                }`}
                              >
                                {s.type === "teach" ? "Обучаю" : "Хочу научиться"}
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
                {exchangeSkills.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Пока нет входящих сообщений по навыкам, которые вы хотите изучать.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col gap-4">
                    {exchangeSkills.map((s) => (
                      <Card key={s.skill_id}>
                        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">{s.skill_name}</h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {s.category_name || "Категория"}
                              </Badge>
                              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-xs">
                                Хочу научиться
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Сообщений: {incomingMessagesCountBySkillId[s.skill_id] || 0}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Собеседников: {(peerIdsBySkillId[s.skill_id] || []).length}
                              </span>
                            </div>
                            {s.description && (
                              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                            )}
                          </div>
                          <Button asChild size="sm" className="sm:shrink-0">
                            <Link
                              href={
                                (peerIdsBySkillId[s.skill_id] || []).length === 1
                                  ? `/chat?with=${peerIdsBySkillId[s.skill_id][0]}`
                                  : "/chat"
                              }
                            >
                              Открыть чат
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
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
