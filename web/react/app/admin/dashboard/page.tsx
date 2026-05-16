"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminFetch } from "@/lib/admin-api-client"

type StatsRes = { stats: Record<string, number | null> }

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Record<string, number | null> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await adminFetch<StatsRes>("/api/admin/stats")
        if (!cancelled) setStats(data.stats)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="text-red-600">{error}</p>
  }

  if (!stats) {
    return <p className="text-slate-500">Загрузка…</p>
  }

  const entries = Object.entries(stats)

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Обзор</h1>
      <p className="mt-1 text-sm text-slate-500">Количество записей по таблицам</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([table, count]) => (
          <Link key={table} href={`/admin/tables/${table}`}>
            <Card className="border-slate-200 bg-white shadow-sm transition-shadow hover:border-emerald-300 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-slate-800">{table}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-emerald-700">
                  {count === null ? "—" : count}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
