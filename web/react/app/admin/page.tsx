"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAdminToken } from "@/lib/admin-api-client"

export default function AdminIndexPage() {
  const router = useRouter()
  useEffect(() => {
    if (getAdminToken()) router.replace("/admin/dashboard")
    else router.replace("/admin/login")
  }, [router])
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-500">
      Перенаправление…
    </div>
  )
}
