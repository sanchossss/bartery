"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-client"
import { initialsFromName } from "@/lib/ui-helpers"

type PublicSkillRow = {
  skill_id: number
  type: "teach" | "learn"
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

type ReviewRow = {
  id: number
  reviewer_name: string
  rating: number
  comment: string | null
  created_at: string
}

export default function PublicUserProfilePage() {
  const params = useParams<{ id: string }>()
  const userId = params?.id
  const [user, setUser] = useState<PublicUser | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [avgRating, setAvgRating] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [u, r] = await Promise.all([
          apiFetch<{ user: PublicUser }>(`/api/users/${userId}`),
          apiFetch<{ reviews: ReviewRow[]; average_rating: number }>(`/api/reviews/${userId}`),
        ])
        if (cancelled) return
        setUser(u.user)
        setReviews(r.reviews || [])
        setAvgRating(r.average_rating || 0)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки профиля")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted-foreground">Загрузка профиля…</div>
  if (error || !user) return <div className="mx-auto max-w-4xl px-4 py-12 text-center text-destructive">{error || "Профиль не найден"}</div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <Link href="/skills" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Назад к каталогу
      </Link>

      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {initialsFromName(user.full_name, user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground">{user.full_name?.trim() || user.username}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Star className="size-4 fill-primary text-primary" />
                <span className="font-semibold">{avgRating || "—"}</span>
                <span className="text-muted-foreground">{reviews.length} отзывов</span>
              </div>
              <p className="mt-3 text-muted-foreground">{user.bio || "Пользователь пока не добавил описание."}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-foreground">Навыки:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(user.skills || []).map((s) => (
                <div key={`${s.skill_id}-${s.type}`} className="rounded-lg border border-border px-3 py-2">
                  <p className="text-sm font-medium">{s.skill_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[11px]">
                      {s.category_name || "Без категории"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${
                        s.type === "teach"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                      }`}
                    >
                      {s.type === "teach" ? "Обучает" : "Изучает"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button className="mt-6" asChild>
            <Link href={`/chat?with=${user.id}`}>Написать сообщение</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

