"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { apiFetch, getStoredAuth } from "@/lib/api-client"
import { initialsFromName } from "@/lib/ui-helpers"
import type { Chat, Message } from "@/lib/types"

type ConvRow = {
  id: number
  username: string
  full_name: string | null
  avatar_url: string | null
  last_message: string | null
  last_at: string | null
  unread: number
}

type MsgRow = {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  created_at: string
}

function formatMsgTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso.replace(" ", "T") + "Z")
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function convToChat(row: ConvRow, messages: Message[]): Chat {
  return {
    id: String(row.id),
    participant: {
      id: String(row.id),
      name: row.full_name?.trim() || row.username,
      avatar: initialsFromName(row.full_name, row.username),
      avatarUrl: row.avatar_url,
      bio: "",
      location: "",
      skills: [],
      rating: 0,
      stats: {
        level: 1,
        xp: 0,
        xpToNextLevel: 1,
        streak: 0,
        totalExchanges: 0,
        totalHours: 0,
        skillsTaught: 0,
        skillsLearned: 0,
      },
      achievements: [],
    },
    lastMessage: row.last_message || "",
    lastMessageTime: formatMsgTime(row.last_at),
    unread: row.unread,
    messages,
  }
}

function ChatListItem({
  chat,
  isActive,
  onClick,
}: {
  chat: Chat
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors",
        isActive ? "bg-primary/10" : "hover:bg-secondary"
      )}
    >
      <Avatar className="size-10 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-semibold",
            isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {chat.participant.avatar}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {chat.participant.name}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {chat.lastMessageTime}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{chat.lastMessage}</p>
      </div>
      {chat.unread > 0 && (
        <Badge className="size-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">
          {chat.unread}
        </Badge>
      )}
    </button>
  )
}

function MessageBubble({
  message,
  myId,
}: {
  message: Message
  myId: number
}) {
  const isMine = message.senderId === String(myId)

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm leading-relaxed">{message.text}</p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            isMine ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {message.timestamp}
        </p>
      </div>
    </div>
  )
}

export default function ChatView() {
  const searchParams = useSearchParams()
  const withParam = searchParams.get("with")

  const auth = getStoredAuth()
  const myId = auth?.user?.id

  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [messagesByPeer, setMessagesByPeer] = useState<Record<string, Message[]>>({})
  const [inputValue, setInputValue] = useState("")
  const [showSidebar, setShowSidebar] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(
    async (peerId: string) => {
      if (!auth?.token) return
      const data = await apiFetch<{ messages: MsgRow[] }>(`/api/messages/${peerId}`, {
        token: auth.token,
      })
      const mapped: Message[] = (data.messages || []).map((m) => ({
        id: String(m.id),
        senderId: String(m.sender_id),
        text: m.content,
        timestamp: formatMsgTime(m.created_at),
      }))
      setMessagesByPeer((prev) => ({ ...prev, [peerId]: mapped }))
    },
    [auth?.token]
  )

  useEffect(() => {
    if (!auth?.token || !myId) {
      setLoading(false)
      setError("Войдите, чтобы пользоваться чатом")
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<{ conversations: ConvRow[] }>("/api/messages", {
          token: auth.token,
        })
        if (cancelled) return
        const list = (data.conversations || []).map((c) => convToChat(c, []))
        setChats(list)

        const prefer = withParam ? String(withParam) : list[0]?.id
        const first = list.find((x) => x.id === prefer) || list[0] || null
        setActiveChat(first)
        if (first) {
          await loadMessages(first.id)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [auth?.token, myId, withParam, loadMessages])

  const currentMessages = activeChat ? messagesByPeer[activeChat.id] || [] : []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentMessages.length])

  async function handleSend() {
    if (!inputValue.trim() || !activeChat || !auth?.token || !myId) return
    const text = inputValue.trim()
    setInputValue("")
    try {
      const data = await apiFetch<{ message: MsgRow }>("/api/messages", {
        method: "POST",
        token: auth.token,
        body: JSON.stringify({
          receiver_id: Number(activeChat.id),
          content: text,
        }),
      })
      const m = data.message
      const mapped: Message = {
        id: String(m.id),
        senderId: String(m.sender_id),
        text: m.content,
        timestamp: formatMsgTime(m.created_at),
      }
      setMessagesByPeer((prev) => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), mapped],
      }))
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? { ...c, lastMessage: text, lastMessageTime: mapped.timestamp }
            : c
        )
      )
    } catch {
      setInputValue(text)
    }
  }

  if (!auth?.token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Button asChild className="mt-4">
          <Link href="/auth">Войти</Link>
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">
        Загрузка чатов…
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-destructive">
        {error}
      </div>
    )
  }

  if (!activeChat && chats.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">
        Пока нет диалогов. Загляните в{" "}
        <Link href="/skills" className="text-primary underline">
          каталог
        </Link>{" "}
        и напишите автору навыка.
      </div>
    )
  }

  if (!activeChat) {
    return null
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] max-w-6xl overflow-hidden max-[600px]:h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom,0px))] max-[600px]:max-h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom,0px))] md:px-4 md:py-6">
      <div className="flex w-full overflow-hidden rounded-none border-border md:rounded-xl md:border">
        <div
          className={cn(
            "flex w-full flex-col border-r border-border bg-card sm:w-80 sm:shrink-0",
            !showSidebar && "hidden sm:flex"
          )}
        >
          <div className="border-b border-border p-4">
            <h2 className="text-lg font-semibold text-foreground">Сообщения</h2>
            <p className="text-xs text-muted-foreground">{chats.length} диалогов</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1 p-2">
              {chats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  isActive={activeChat.id === chat.id}
                  onClick={() => {
                    setActiveChat(chat)
                    setShowSidebar(false)
                    void loadMessages(chat.id)
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col bg-background",
            showSidebar && "hidden sm:flex"
          )}
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={() => setShowSidebar(true)}
              className="text-sm text-muted-foreground sm:hidden"
            >
              &larr;
            </button>
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {activeChat.participant.avatar}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{activeChat.participant.name}</p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-3 p-4">
              {currentMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} myId={myId!} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleSend()
              }}
              className="flex items-center gap-2"
            >
              <Input
                placeholder="Напишите сообщение..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!inputValue.trim()} className="shrink-0">
                <Send className="size-4" />
                <span className="sr-only">Отправить</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
