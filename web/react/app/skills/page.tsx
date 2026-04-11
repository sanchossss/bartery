import { Suspense } from "react"
import SkillsCatalog from "@/components/skills-catalog"

export const metadata = {
  title: "Каталог навыков — SkillSwap",
  description: "Просмотрите все доступные навыки для обмена на платформе SkillSwap.",
}

export default function SkillsPage() {
  return (
    <Suspense>
      <SkillsCatalog />
    </Suspense>
  )
}
