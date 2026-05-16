"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminFetch, getAdminToken, setAdminToken } from "@/lib/admin-api-client"

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getAdminToken()) router.replace("/admin/dashboard")
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await adminFetch<{ token: string }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      })
      setAdminToken(res.token)
      router.push("/admin/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-md">
        <div className="mb-6 flex justify-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Lock className="size-6" />
          </div>
        </div>
        <h1 className="text-center text-xl font-semibold text-slate-900">Вход в админку</h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Пароль задаётся в окружении контейнера <code className="text-slate-700">ADMIN_PASSWORD</code>
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-slate-700">
              Пароль
            </Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-slate-300 bg-white text-slate-900"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            {loading ? "Вход…" : "Войти"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-emerald-700 hover:underline">
            На главную
          </Link>
        </p>
      </div>
    </div>
  )
}
