import Link from "next/link"
import { ArrowLeftRight } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <ArrowLeftRight className="size-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            SkillSwap
          </span>
        </div>
        <nav className="flex gap-6">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Главная
          </Link>
          <Link
            href="/skills"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Каталог
          </Link>
          <Link
            href="/chat"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Чат
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          SkillSwap 2026. Обмен знаниями.
        </p>
      </div>
    </footer>
  )
}
