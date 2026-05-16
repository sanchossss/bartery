"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { adminFetch } from "@/lib/admin-api-client"
import { Card, CardContent } from "@/components/ui/card"

type TablesRes = { tables: string[] }

export default function AdminTablesIndexPage() {
  const [tables, setTables] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await adminFetch<TablesRes>("/api/admin/tables")
        if (!cancelled) setTables(data.tables || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Таблицы</h1>
      <p className="mt-1 text-sm text-slate-500">Просмотр, добавление, редактирование и удаление строк</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t) => (
          <Link key={t} href={`/admin/tables/${t}`}>
            <Card className="border-slate-200 bg-white shadow-sm transition-all hover:border-emerald-300 hover:shadow-md">
              <CardContent className="py-4">
                <p className="font-mono text-sm font-medium text-emerald-800">{t}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
