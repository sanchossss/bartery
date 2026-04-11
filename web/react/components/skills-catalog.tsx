"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Search, Star, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { apiFetch } from "@/lib/api-client"
import { teachOfferToSkill } from "@/lib/mappers"
import type { Skill } from "@/lib/types"
import type { TeachOfferRow } from "@/lib/types"
import { getLevelLabel } from "@/lib/ui-helpers"

type CategoryRow = { id: number; name: string }

function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Link href={`/skills/${skill.id}`}>
      <Card className="h-full transition-colors hover:border-primary/30">
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="secondary" className="text-xs">
              {skill.category}
            </Badge>
            <Badge variant="outline" className="shrink-0 text-xs">
              {getLevelLabel(skill.level)}
            </Badge>
          </div>
          <h3 className="mt-3 text-base font-semibold text-foreground">{skill.title}</h3>
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {skill.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {skill.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                  {skill.user.avatar}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {skill.user.name.split(" ")[0]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="size-3.5 fill-primary text-primary" />
              <span className="text-sm font-medium text-foreground">
                {skill.rating || "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function SkillsCatalog() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("category") || ""

  const [query, setQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [skills, setSkills] = useState<Skill[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cat = searchParams.get("category") || ""
    setSelectedCategory(cat)
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [offRes, catRes] = await Promise.all([
          apiFetch<{ offers: TeachOfferRow[] }>("/api/teach-offers?limit=200"),
          apiFetch<{ categories: CategoryRow[] }>("/api/categories"),
        ])
        if (cancelled) return
        setCategories(catRes.categories || [])
        setSkills((offRes.offers || []).map(teachOfferToSkill))
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось загрузить каталог")
          setSkills([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      const matchesQuery =
        !query ||
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase()) ||
        s.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      const matchesCategory = !selectedCategory || s.category === selectedCategory
      return matchesQuery && matchesCategory
    })
  }, [query, selectedCategory, skills])

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">
        Загрузка каталога…
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-destructive">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Убедитесь, что бэкенд запущен (Docker) и Next.js проксирует /api (см. next.config.mjs).
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Каталог навыков</h1>
        <p className="mt-2 text-muted-foreground">
          Найдите навык для обмена среди {skills.length} предложений
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск навыков..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2 sm:hidden" type="button">
          <SlidersHorizontal className="size-4" />
          Фильтры
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory("")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            !selectedCategory
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          Все
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === cat.name ? "" : cat.name)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === cat.name
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {(query || selectedCategory) && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Найдено: {filtered.length}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            type="button"
            onClick={() => {
              setQuery("")
              setSelectedCategory("")
            }}
          >
            <X className="size-3" />
            Сбросить
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-foreground">Ничего не найдено</p>
          <p className="mt-2 text-muted-foreground">Попробуйте изменить параметры поиска</p>
        </div>
      )}
    </div>
  )
}
