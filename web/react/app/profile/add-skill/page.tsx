"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { apiFetch, getStoredAuth } from "@/lib/api-client"

type SkillOption = {
  id: number
  name: string
  category_name?: string | null
}

export default function AddSkillPage() {
  const router = useRouter()
  const [allSkills, setAllSkills] = useState<SkillOption[]>([])
  const [query, setQuery] = useState("")
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null)
  const [selectedType, setSelectedType] = useState<"teach" | "learn">("teach")
  const [selectedLevel, setSelectedLevel] = useState(4)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getStoredAuth()
    if (!auth?.token) {
      router.replace("/auth")
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const skillsRes = await apiFetch<{ skills: SkillOption[] }>("/api/skills")
        if (!cancelled) setAllSkills(skillsRes.skills || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки навыков")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const filteredSkills = useMemo(
    () => allSkills.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [allSkills, query]
  )

  async function handleSubmit() {
    const auth = getStoredAuth()
    if (!auth?.token || !selectedSkillId) return
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch("/api/users/me/skills", {
        method: "POST",
        token: auth.token,
        body: JSON.stringify({
          skill_id: selectedSkillId,
          type: selectedType,
          proficiency_level: selectedLevel,
        }),
      })
      router.push("/profile")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить навык")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 md:py-10">
      <Link href="/profile" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Назад в профиль
      </Link>

      <Card className="rounded-xl">
        <CardContent className="p-4 md:p-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Выберите навык</h1>

          <Input
            className="mt-4 h-11 rounded-xl text-sm"
            placeholder="Поиск навыков"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Загрузка навыков…</p>
          ) : (
            <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
              {filteredSkills.slice(0, 50).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSkillId(s.id)}
                  className={`w-full rounded-xl border p-2.5 text-left transition-colors ${
                    selectedSkillId === s.id
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-border hover:bg-secondary/50"
                  }`}
                >
                  <p className="text-base font-semibold leading-tight text-foreground">{s.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.category_name || "Без категории"}</p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium">Тип:</p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant={selectedType === "teach" ? "default" : "outline"}
                onClick={() => setSelectedType("teach")}
                className="h-9 rounded-full px-4 text-sm"
              >
                Обучаю
              </Button>
              <Button
                type="button"
                variant={selectedType === "learn" ? "default" : "outline"}
                onClick={() => setSelectedType("learn")}
                className="h-9 rounded-full px-4 text-sm"
              >
                Хочу научиться
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium">Уровень владения: {selectedLevel}</p>
            <input
              className="mt-2 w-full"
              type="range"
              min={1}
              max={5}
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(Number(e.target.value))}
            />
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <Button
            className="mt-5 h-10 w-full rounded-full text-sm"
            disabled={!selectedSkillId || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Добавление..." : "Добавить выбранный навык"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

