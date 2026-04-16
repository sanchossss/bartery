"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, MessageCircle, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { apiFetch } from "@/lib/api-client"
import { teachOfferToSkill } from "@/lib/mappers"
import type { Skill } from "@/lib/types"
import type { TeachOfferRow } from "@/lib/types"
import { parseOfferSlug } from "@/lib/types"
import { getLevelLabel } from "@/lib/ui-helpers"

type PublicSkillRow = {
  skill_id: number
  type: string
  proficiency_level: number
  description: string | null
  skill_name: string
  category_name: string | null
}

type PublicUser = {
  id: number
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  points: number
  skills: PublicSkillRow[]
}

function buildSkillFromProfile(
  profile: PublicUser,
  skillId: number,
  avgRating: number,
  reviewCount: number
): Skill | null {
  const sameSkillRows = (profile.skills || []).filter((s) => s.skill_id === skillId)
  // Slug currently contains userId-skillId, so type is not encoded.
  // Prefer "teach" when both exist, otherwise fallback to any existing row.
  const row =
    sameSkillRows.find((s) => s.type === "teach") ||
    sameSkillRows[0]
  if (!row) return null

  const synthetic: TeachOfferRow = {
    user_id: profile.id,
    skill_id: skillId,
    offer_type: row.type === "learn" ? "learn" : "teach",
    proficiency_level: row.proficiency_level,
    offer_description: row.description,
    username: profile.username,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    skill_name: row.skill_name,
    skill_description: null,
    category_id: null,
    category_name: row.category_name,
    teacher_avg_rating: avgRating,
    teacher_review_count: reviewCount,
  }
  return teachOfferToSkill(synthetic)
}

export default function SkillDetailClient({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: slug } = use(params)
  const parsed = parseOfferSlug(slug)

  const [skill, setSkill] = useState<Skill | null>(null)
  const [similarSkills, setSimilarSkills] = useState<Skill[]>([])
  const [otherSkills, setOtherSkills] = useState<Skill[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => !!parseOfferSlug(slug))

  useEffect(() => {
    const p = parseOfferSlug(slug)
    if (!p) {
      setError("Неверная ссылка")
      setLoading(false)
      setSkill(null)
      setSimilarSkills([])
      setOtherSkills([])
      return
    }

    const { userId, skillId } = p
    let cancelled = false

    setLoading(true)
    setError(null)
    setSkill(null)
    setSimilarSkills([])
    setOtherSkills([])

    ;(async () => {
      try {
        const [profileRes, reviewsRes, offersRes] = await Promise.all([
          apiFetch<{ user: PublicUser }>(`/api/users/${userId}`),
          apiFetch<{ average_rating: number; total: number }>(`/api/reviews/${userId}`),
          apiFetch<{ offers: TeachOfferRow[] }>("/api/teach-offers?limit=150"),
        ])
        if (cancelled) return

        const profile = profileRes.user
        const built = buildSkillFromProfile(
          profile,
          skillId,
          reviewsRes.average_rating || 0,
          reviewsRes.total || 0
        )
        if (!built) {
          if (!cancelled) {
            setError("Навык не найден")
            setSkill(null)
            setLoading(false)
          }
          return
        }
        const skillLabels = (profile.skills || []).map((s) => s.skill_name)
        built.user.skills = [...new Set(skillLabels)]

        const all = (offersRes.offers || []).map(teachOfferToSkill)
        const similar = all
          .filter((s) => s.category === built.category && s.id !== built.id)
          .slice(0, 3)
        const other = all
          .filter((s) => s.userId === built.userId && s.id !== built.id)
          .slice(0, 2)

        if (!cancelled) {
          setSkill(built)
          setSimilarSkills(similar)
          setOtherSkills(other)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка загрузки")
          setSkill(null)
          setSimilarSkills([])
          setOtherSkills([])
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [slug])

  if (!parsed) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center text-muted-foreground">
        Неверная ссылка на навык
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center text-muted-foreground">
        Загрузка…
      </div>
    )
  }

  if (error || !skill) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center">
        <p className="text-destructive">{error || "Не найдено"}</p>
        <Button asChild className="mt-4">
          <Link href="/skills">В каталог</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <Link
        href="/skills"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Назад к каталогу
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{skill.category}</Badge>
        <Badge variant="outline">{getLevelLabel(skill.level)}</Badge>
        <Badge
          variant="outline"
          className={
            skill.exchangeType === "teach"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }
        >
          {skill.exchangeType === "teach" ? "Обучаю" : "Хочу научиться"}
        </Badge>
      </div>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        {skill.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="size-4 fill-primary text-primary" />
          <span className="font-medium text-foreground">{skill.rating || "—"}</span>
          <span>({skill.reviewCount} отзывов)</span>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Описание</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{skill.longDescription}</p>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">Теги</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {skill.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Card className="rounded-2xl border border-border/80 shadow-sm lg:sticky lg:top-24">
          <CardContent className="space-y-0 p-6 md:p-8 lg:p-6">
          <div className="flex gap-4">
            <Avatar className="size-14 shrink-0 ring-2 ring-background">
              <AvatarFallback className="rounded-full bg-primary/15 text-base font-semibold text-primary">
                {skill.user.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
              <Link
                href={`/users/${skill.userId}`}
                className="text-lg font-bold leading-tight tracking-tight text-foreground hover:text-primary"
              >
                {skill.user.name}
              </Link>
              <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <Star className="size-4 shrink-0 fill-primary text-primary" />
                <span className="font-semibold text-foreground">
                  {skill.user.rating ?? "—"}
                </span>
                <span>рейтинг преподавателя</span>
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
            {skill.user.bio || "Пользователь ещё не заполнил описание."}
          </p>

          <Separator className="my-6" />

          {skill.user.skills.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground">Навыки в профиле:</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {skill.user.skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-sm font-normal text-foreground shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button className="mt-6 h-12 w-full gap-2 rounded-xl text-base font-medium" size="lg" asChild>
            <Link href={`/chat?with=${skill.userId}`}>
              <MessageCircle className="size-5" />
              Написать сообщение
            </Link>
          </Button>

          {otherSkills.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <p className="text-sm font-semibold text-foreground">Другие навыки автора:</p>
                <div className="mt-3 flex flex-col gap-3">
                  {otherSkills.map((s) => (
                    <Link
                      key={s.id}
                      href={`/skills/${s.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/25 hover:bg-muted/30"
                    >
                      <span className="text-sm font-medium leading-snug text-foreground">
                        {s.title}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Star className="size-4 fill-primary text-primary" />
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {s.rating || "—"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
        </Card>
      </div>

      {similarSkills.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">Похожие навыки</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similarSkills.map((s) => (
              <Link key={s.id} href={`/skills/${s.id}`}>
                <Card className="transition-colors hover:border-primary/30">
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="text-xs">
                      {s.category}
                    </Badge>
                    <h3 className="mt-2 font-medium text-foreground">{s.title}</h3>
                    <div className="mt-2 flex items-center gap-1">
                      <Star className="size-3 fill-primary text-primary" />
                      <span className="text-sm text-foreground">{s.rating || "—"}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
