"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Database, LayoutDashboard, LogOut, ScrollText } from "lucide-react"
import { clearAdminToken, getAdminToken } from "@/lib/admin-api-client"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/admin/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/admin/tables", label: "Таблицы", icon: Database },
  { href: "/admin/logs", label: "Логи API", icon: ScrollText },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLogin = pathname === "/admin/login"

  useEffect(() => {
    if (isLogin) return
    if (!getAdminToken()) router.replace("/admin/login")
  }, [isLogin, pathname, router])

  if (isLogin) {
    return <div className="min-h-dvh bg-slate-100 text-slate-900">{children}</div>
  }

  return (
    <div className="flex min-h-dvh bg-slate-50 text-slate-900">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Bartery</p>
          <p className="text-sm font-semibold text-slate-900">Админ-панель</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-emerald-50 font-medium text-emerald-900 ring-1 ring-emerald-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <Link
            href="/"
            className="mb-2 block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            На сайт
          </Link>
          <Link
            href="/legacy-admin/"
            className="mb-2 block rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            Старая PHP-админка БД
          </Link>
          <button
            type="button"
            onClick={() => {
              clearAdminToken()
              router.push("/admin/login")
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            <LogOut className="size-4" />
            Выйти
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1 overflow-auto p-6">{children}</div>
    </div>
  )
}
