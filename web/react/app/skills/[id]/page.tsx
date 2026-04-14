import SkillDetailClient from "./skill-detail-client"

export const metadata = {
  title: "Навык — Bartery",
  description: "Карточка предложения обмена навыками",
}

export default function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <SkillDetailClient params={params} />
}
