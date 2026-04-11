import { Suspense } from "react"
import ChatView from "@/components/chat-view"

export const metadata = {
  title: "Чат — SkillSwap",
  description: "Общайтесь с другими участниками платформы SkillSwap.",
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Загрузка…</div>}>
      <ChatView />
    </Suspense>
  )
}
