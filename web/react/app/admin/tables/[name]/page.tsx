"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import { adminFetch } from "@/lib/admin-api-client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PAGE = 50

type ColumnMeta = {
  field: string
  type: string
  nullable: boolean
  key: string
  extra: string
  default: unknown
}

type RowsRes = {
  table: string
  columns: string[]
  column_meta?: ColumnMeta[]
  primary_key: string[]
  total: number
  limit: number
  offset: number
  rows: Record<string, unknown>[]
}

function cellPreview(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "object") return JSON.stringify(v)
  const s = String(v)
  return s.length > 80 ? s.slice(0, 80) + "…" : s
}

function isAutoIncrement(m: ColumnMeta): boolean {
  return m.extra.toLowerCase().includes("auto_increment")
}

function valueToInputString(v: unknown, meta: ColumnMeta): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "object") return JSON.stringify(v, null, 2)
  return String(v)
}

function coerceField(raw: string, meta: ColumnMeta, useNull: boolean): unknown {
  if (useNull) return null
  const t = meta.type.toLowerCase()
  if (raw === "") {
    if (meta.nullable) return null
    return ""
  }
  if (t.includes("json")) {
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return raw
    }
  }
  if (t.includes("int") || t.includes("year")) {
    const n = Number(raw)
    if (!Number.isNaN(n) && Number.isFinite(n)) return Math.trunc(n)
    return raw
  }
  if (t.includes("decimal") || t.includes("float") || t.includes("double")) {
    const n = Number(raw)
    return Number.isFinite(n) ? n : raw
  }
  return raw
}

export default function AdminTableDetailPage() {
  const params = useParams<{ name: string }>()
  const table = params?.name ?? ""
  const [data, setData] = useState<RowsRes | null>(null)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null)
  const [formStrings, setFormStrings] = useState<Record<string, string>>({})
  const [formNulls, setFormNulls] = useState<Record<string, boolean>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const q = new URLSearchParams({ table, limit: String(PAGE), offset: String(offset) })
      const res = await adminFetch<RowsRes>(`/api/admin/rows?${q.toString()}`)
      setData(res)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : "Ошибка загрузки")
    }
  }, [table, offset])

  useEffect(() => {
    void load()
  }, [load])

  const pkCols = data?.primary_key ?? []

  const formFields = useMemo(() => {
    const list = data?.column_meta ?? []
    if (dialogMode === "create") return list.filter((c) => !isAutoIncrement(c))
    return list
  }, [data?.column_meta, dialogMode])

  const buildPk = useCallback(
    (row: Record<string, unknown>) => {
      const pk: Record<string, unknown> = {}
      for (const k of pkCols) {
        if (k in row) pk[k] = row[k]
      }
      return pk
    },
    [pkCols]
  )

  const canDelete = pkCols.length > 0

  function openCreate() {
    setDialogMode("create")
    setEditRowIndex(null)
    const str: Record<string, string> = {}
    const nul: Record<string, boolean> = {}
    for (const c of data?.column_meta ?? []) {
      if (isAutoIncrement(c)) continue
      str[c.field] = ""
      nul[c.field] = false
    }
    setFormStrings(str)
    setFormNulls(nul)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(row: Record<string, unknown>, index: number) {
    setDialogMode("edit")
    setEditRowIndex(index)
    const str: Record<string, string> = {}
    const nul: Record<string, boolean> = {}
    for (const c of data?.column_meta ?? []) {
      const v = row[c.field]
      str[c.field] = valueToInputString(v, c)
      nul[c.field] = v === null || v === undefined
    }
    setFormStrings(str)
    setFormNulls(nul)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!data) return
    setFormError(null)
    setSaving(true)
    try {
      const metaList = data.column_meta ?? []
      if (dialogMode === "create") {
        const row: Record<string, unknown> = {}
        for (const m of metaList) {
          if (isAutoIncrement(m)) continue
          const raw = formStrings[m.field] ?? ""
          const useN = !!formNulls[m.field]
          row[m.field] = coerceField(raw, m, useN && m.nullable)
        }
        await adminFetch("/api/admin/rows", {
          method: "POST",
          body: JSON.stringify({ table: data.table, row }),
        })
      } else {
        if (editRowIndex === null || !data.rows[editRowIndex]) return
        const original = data.rows[editRowIndex]
        const pk = buildPk(original)
        const row: Record<string, unknown> = {}
        for (const m of metaList) {
          if (pkCols.includes(m.field)) continue
          const raw = formStrings[m.field] ?? ""
          const useN = !!formNulls[m.field]
          const nextVal = coerceField(raw, m, useN && m.nullable)
          const prev = original[m.field]
          const same =
            (prev === null || prev === undefined) && nextVal === null
              ? true
              : JSON.stringify(prev) === JSON.stringify(nextVal)
          if (!same) row[m.field] = nextVal
        }
        if (Object.keys(row).length === 0) {
          setFormError("Нет изменений для сохранения")
          setSaving(false)
          return
        }
        await adminFetch("/api/admin/rows", {
          method: "PATCH",
          body: JSON.stringify({ table: data.table, pk, row }),
        })
      }
      setDialogOpen(false)
      await load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: Record<string, unknown>) {
    const pk = buildPk(row)
    if (!Object.keys(pk).length) return
    if (!confirm("Удалить эту запись? Это действие необратимо.")) return
    setBusy(JSON.stringify(pk))
    try {
      await adminFetch("/api/admin/rows", {
        method: "DELETE",
        body: JSON.stringify({ table, pk }),
      })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка удаления")
    } finally {
      setBusy(null)
    }
  }

  const maxOffset = useMemo(() => {
    if (!data) return 0
    return Math.max(0, data.total - PAGE)
  }, [data])

  if (!table) {
    return <p className="text-slate-500">Не указана таблица</p>
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/tables" className="text-sm text-emerald-700 hover:text-emerald-900 hover:underline">
          ← Все таблицы
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-bold text-slate-900">{table}</h1>
          <p className="mt-1 text-sm text-slate-500">{data ? `Всего записей: ${data.total}` : "…"}</p>
        </div>
        {data && (
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => openCreate()}
          >
            <Plus className="mr-1 size-4" />
            Добавить запись
          </Button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {data && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-300 bg-white text-slate-800"
              disabled={offset <= 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE))}
            >
              <ChevronLeft className="size-4" />
              Назад
            </Button>
            <span className="text-sm text-slate-600">
              {offset + 1}–{Math.min(offset + data.rows.length, data.total)} из {data.total}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-300 bg-white text-slate-800"
              disabled={offset + data.rows.length >= data.total}
              onClick={() => setOffset((o) => Math.min(maxOffset, o + PAGE))}
            >
              Вперёд
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                  {canDelete && <TableHead className="w-28 text-slate-600">Действия</TableHead>}
                  {data.columns.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap text-slate-700">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row, i) => {
                  const pkKey = JSON.stringify(buildPk(row))
                  return (
                    <TableRow key={i} className="border-slate-100">
                      {canDelete && (
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-slate-600 hover:bg-slate-100"
                              title="Редактировать"
                              onClick={() => openEdit(row, i)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-red-600 hover:bg-red-50"
                              disabled={busy === pkKey}
                              onClick={() => void handleDelete(row)}
                              title="Удалить"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      {data.columns.map((c) => (
                        <TableCell
                          key={c}
                          className="max-w-[240px] truncate text-slate-800"
                          title={String(row[c] ?? "")}
                        >
                          {cellPreview(row[c])}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {!canDelete && (
            <p className="mt-4 text-sm text-amber-700">
              У этой таблицы нет первичного ключа в схеме — удаление и редактирование по строке ограничены.
            </p>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] border-slate-200 bg-white text-slate-900 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Новая запись" : "Редактирование"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4 py-1">
              {formFields.map((m) => {
                const long = m.type.toLowerCase().includes("text") || m.type.toLowerCase().includes("json")
                const readOnlyAi = dialogMode === "edit" && isAutoIncrement(m)
                return (
                  <div key={m.field} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="font-mono text-xs text-slate-700">
                        {m.field}
                        <span className="ml-2 font-sans text-slate-400">({m.type})</span>
                      </Label>
                      {m.nullable && (
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <Checkbox
                            checked={!!formNulls[m.field]}
                            onCheckedChange={(v) =>
                              setFormNulls((prev) => ({ ...prev, [m.field]: v === true }))
                            }
                          />
                          NULL
                        </label>
                      )}
                    </div>
                    {long ? (
                      <Textarea
                        className="min-h-24 border-slate-300 bg-white font-mono text-sm"
                        disabled={(m.nullable && !!formNulls[m.field]) || readOnlyAi}
                        value={formStrings[m.field] ?? ""}
                        onChange={(e) => setFormStrings((s) => ({ ...s, [m.field]: e.target.value }))}
                      />
                    ) : (
                      <Input
                        className="border-slate-300 bg-white"
                        disabled={(m.nullable && !!formNulls[m.field]) || readOnlyAi}
                        value={formStrings[m.field] ?? ""}
                        onChange={(e) => setFormStrings((s) => ({ ...s, [m.field]: e.target.value }))}
                      />
                    )}
                    {readOnlyAi && (
                      <p className="text-xs text-slate-500">Автоинкремент — не редактируется.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="border-slate-300" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
