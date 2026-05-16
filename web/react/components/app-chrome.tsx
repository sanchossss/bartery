"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/header"

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <Header />
      <main className="min-h-dvh max-[600px]:pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] min-[601px]:min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </>
  )
}
