import { Suspense } from "react"
import SkillsCatalog from "@/components/skills-catalog"

export const metadata = {
  title: "Каталог навыков — Bartery",
  description: "Просмотрите все доступные навыки для обмена на платформе Bartery.",
}

export default function SkillsPage() {
  return (
    <Suspense>
      <SkillsCatalog />
    </Suspense>
  )
}
