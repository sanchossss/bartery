import Link from "next/link"
import { BookOpen, MessageCircle, RefreshCw, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CategoriesSectionDynamic,
  LeaderboardSectionDynamic,
  PopularSkillsSection,
  StatsSectionDynamic,
} from "@/components/home-api-sections"

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-card pb-16 pt-20 md:pb-24 md:pt-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/0.08,transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-4 text-center">
        <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
          Бесплатная платформа обмена знаниями
        </Badge>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl">
          Обменивайтесь навыками с другими людьми
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          {"Вы знаете Python, а кто-то \u2014 французский. Учите друг друга, экономьте деньги и находите единомышленников."}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild className="gap-2">
            <Link href="/skills">
              <Search className="size-4" />
              Найти навык
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="gap-2">
            <Link href="/skills">
              <BookOpen className="size-4" />
              Предложить свой
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: "Найдите навык",
      description:
        "Просмотрите каталог навыков или воспользуйтесь поиском по категориям.",
    },
    {
      icon: MessageCircle,
      title: "Договоритесь",
      description:
        "Напишите владельцу навыка и предложите обмен своими умениями.",
    },
    {
      icon: RefreshCw,
      title: "Обменивайтесь",
      description:
        "Учите друг друга в удобном формате \u2014 онлайн или при личной встрече.",
    },
  ]

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Как это работает
          </h2>
          <p className="mt-3 text-muted-foreground">
            Три простых шага до нового навыка
          </p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <step.icon className="size-6 text-primary" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorks />
      <PopularSkillsSection />
      <CategoriesSectionDynamic />
      <LeaderboardSectionDynamic />
      <StatsSectionDynamic />
    </>
  )
}
