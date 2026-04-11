"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeftRight, BookOpen, Home, LogIn, MessageCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { getStoredAuth } from "@/lib/api-client"

const navItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/skills", label: "Каталог", icon: BookOpen },
  { href: "/chat", label: "Чат", icon: MessageCircle },
]

function navItemClassName(isActive: boolean) {
  return cn(
    "flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors min-[601px]:flex-row min-[601px]:gap-2 min-[601px]:px-3 min-[601px]:py-2 min-[601px]:text-sm",
    isActive
      ? "text-primary"
      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
  )
}

export function Header() {
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    setLoggedIn(!!getStoredAuth()?.token)
  }, [pathname])

  return (
    <header
      className={cn(
        "z-50 border-border bg-background/95 backdrop-blur-md",
        "sticky top-0 border-b",
        "max-[600px]:fixed max-[600px]:top-auto max-[600px]:bottom-0 max-[600px]:left-0 max-[600px]:right-0 max-[600px]:border-t max-[600px]:border-b-0",
        "max-[600px]:pb-[env(safe-area-inset-bottom,0px)]"
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-16 max-w-6xl items-center px-4",
          "min-[601px]:justify-between",
          "max-[600px]:h-14 max-[600px]:max-w-none max-[600px]:justify-around max-[600px]:px-1"
        )}
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 max-[600px]:hidden"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <ArrowLeftRight className="size-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">SkillSwap</span>
        </Link>

        <nav
          className={cn(
            "flex items-center gap-1",
            "min-[601px]:flex-1 min-[601px]:justify-end",
            "max-[600px]:w-full max-[600px]:justify-around max-[600px]:gap-0"
          )}
        >
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

            return (
              <Link key={item.href} href={item.href} className={navItemClassName(isActive)}>
                <item.icon className="size-5 min-[601px]:size-4" />
                <span className="max-[600px]:text-[10px] min-[601px]:inline">{item.label}</span>
              </Link>
            )
          })}

          <div
            className={cn(
              "flex items-center border-border min-[601px]:ml-2 min-[601px]:border-l min-[601px]:pl-3",
              "max-[600px]:ml-0 max-[600px]:border-l-0 max-[600px]:pl-0"
            )}
          >
            {!loggedIn ? (
              <Link
                href="/auth"
                className={navItemClassName(pathname.startsWith("/auth"))}
              >
                <LogIn className="size-5 min-[601px]:size-4" />
                <span className="max-[600px]:text-[10px] min-[601px]:inline">Войти</span>
              </Link>
            ) : (
              <Link
                href="/profile"
                className={navItemClassName(pathname.startsWith("/profile"))}
              >
                <User className="size-5 min-[601px]:size-4" />
                <span className="max-[600px]:text-[10px] min-[601px]:inline">Профиль</span>
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
