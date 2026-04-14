"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Camera, Send } from "lucide-react"
import { JitsiMeeting } from "@jitsi/react-sdk"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

type PublicUserRow = {
  id: number
  username: string
  full_name: string | null
  avatar_url: string | null
}

type VideoCallRow = {
  id: number
  caller_id: number
  callee_id: number
  room_name: string
  status: "pending" | "active" | "cancelled" | "completed"
}

const CALL_SUMMARY_PREFIX = "__CALL_SUMMARY__:"

type CallSummaryPayload = {
  callId: number
  status: "completed" | "cancelled"
  durationSec: number
}

function formatMsgTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso.replace(" ", "T") + "Z")
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function parseCallSummary(text: string): CallSummaryPayload | null {
  if (!text.startsWith(CALL_SUMMARY_PREFIX)) return null
  try {
    const parsed = JSON.parse(text.slice(CALL_SUMMARY_PREFIX.length)) as CallSummaryPayload
    if (!parsed || typeof parsed.callId !== "number" || typeof parsed.durationSec !== "number") return null
    if (parsed.status !== "completed" && parsed.status !== "cancelled") return null
    return parsed
  } catch {
    return null
  }
}

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}:${String(secs).padStart(2, "0")}`
}

function convToChat(row: ConvRow, messages: Message[]): Chat {
  const summary = row.last_message ? parseCallSummary(row.last_message) : null
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
    lastMessage: summary ? "Сессия видеозвонка" : row.last_message || "",
    lastMessageTime: formatMsgTime(row.last_at),
    unread: row.unread,
    messages,
  }
}

function publicUserToChat(user: PublicUserRow): Chat {
  return {
    id: String(user.id),
    participant: {
      id: String(user.id),
      name: user.full_name?.trim() || user.username,
      avatar: initialsFromName(user.full_name, user.username),
      avatarUrl: user.avatar_url,
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
    lastMessage: "",
    lastMessageTime: "",
    unread: 0,
    messages: [],
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
  const callSummary = parseCallSummary(message.text)

  if (callSummary) {
    return (
      <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[85%] rounded-xl border px-4 py-3",
            isMine
              ? "border-primary/20 bg-primary/10 text-foreground"
              : "border-border bg-muted/40 text-foreground"
          )}
        >
          <p className="text-sm font-medium">
            {callSummary.status === "completed" ? "Видеозвонок завершён" : "Видеозвонок отменён"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Длительность: {formatDuration(callSummary.durationSec)} · ID #{callSummary.callId}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">{message.timestamp}</p>
        </div>
      </div>
    )
  }

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
  const [callLoading, setCallLoading] = useState(false)
  const [callError, setCallError] = useState<string | null>(null)
  const [isCallOpen, setIsCallOpen] = useState(false)
  const [activeCall, setActiveCall] = useState<VideoCallRow | null>(null)
  const [callStartedAtMs, setCallStartedAtMs] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const jitsiApiRef = useRef<{ executeCommand?: (command: string) => void } | null>(null)
  const isClosingCallRef = useRef(false)

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
        let list = (data.conversations || []).map((c) => convToChat(c, []))

        // Open direct chat from skill page even if no messages yet.
        if (withParam && !list.some((x) => x.id === String(withParam))) {
          try {
            const userData = await apiFetch<{ user: PublicUserRow }>(`/api/users/${withParam}`)
            if (!cancelled && userData?.user) {
              list = [publicUserToChat(userData.user), ...list]
            }
          } catch {
            // ignore and keep existing list
          }
        }

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
        prev
          .map((c) =>
            c.id === activeChat.id
              ? { ...c, lastMessage: text, lastMessageTime: mapped.timestamp }
              : c
          )
          .sort((a, b) => (a.id === activeChat.id ? -1 : b.id === activeChat.id ? 1 : 0))
      )
    } catch {
      setInputValue(text)
    }
  }

  async function closeCallSession() {
    if (!activeCall || !auth?.token) return
    try {
      await apiFetch(`/api/call/end/${activeCall.id}`, {
        method: "POST",
        token: auth.token,
      })
    } catch {
      try {
        await apiFetch(`/api/call/cancel/${activeCall.id}`, {
          method: "POST",
          token: auth.token,
        })
      } catch {
        // Ignore API teardown errors and still close local UI.
      }
    }
  }

  async function handleStartCall() {
    if (!activeChat || !auth?.token || callLoading) return
    setCallLoading(true)
    setCallError(null)
    try {
      const res = await apiFetch<{ call: VideoCallRow }>("/api/call/start", {
        method: "POST",
        token: auth.token,
        body: JSON.stringify({
          callee_id: Number(activeChat.id),
        }),
      })
      setActiveCall(res.call)
      setCallStartedAtMs(Date.now())
      setIsCallOpen(true)
    } catch (e) {
      setCallError(e instanceof Error ? e.message : "Не удалось начать видеозвонок")
    } finally {
      setCallLoading(false)
    }
  }

  async function handleCallDialogChange(open: boolean) {
    if (!open) {
      if (isClosingCallRef.current) return
      isClosingCallRef.current = true
      jitsiApiRef.current?.executeCommand?.("hangup")
      await closeCallSession()
      if (activeCall && activeChat && auth?.token) {
        const durationSec = callStartedAtMs ? Math.max(0, Math.floor((Date.now() - callStartedAtMs) / 1000)) : 0
        const summaryPayload: CallSummaryPayload = {
          callId: activeCall.id,
          status: durationSec > 0 ? "completed" : "cancelled",
          durationSec,
        }
        const summaryText = `${CALL_SUMMARY_PREFIX}${JSON.stringify(summaryPayload)}`
        try {
          const sent = await apiFetch<{ message: MsgRow }>("/api/messages", {
            method: "POST",
            token: auth.token,
            body: JSON.stringify({
              receiver_id: Number(activeChat.id),
              content: summaryText,
            }),
          })
          const mapped: Message = {
            id: String(sent.message.id),
            senderId: String(sent.message.sender_id),
            text: sent.message.content,
            timestamp: formatMsgTime(sent.message.created_at),
          }
          setMessagesByPeer((prev) => ({
            ...prev,
            [activeChat.id]: [...(prev[activeChat.id] || []), mapped],
          }))
          setChats((prev) =>
            prev.map((c) =>
              c.id === activeChat.id
                ? { ...c, lastMessage: "Сессия видеозвонка", lastMessageTime: mapped.timestamp }
                : c
            )
          )
        } catch {
          // Keep chat usable even if summary message send fails.
        }
      }
      setIsCallOpen(false)
      setActiveCall(null)
      setCallStartedAtMs(null)
      isClosingCallRef.current = false
      return
    }
    setIsCallOpen(true)
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
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="ml-auto"
              onClick={() => void handleStartCall()}
              disabled={callLoading}
            >
              <Camera className="size-4" />
              <span className="sr-only">Начать видеозвонок</span>
            </Button>
          </div>
          {callError && (
            <div className="border-b border-border px-4 py-2 text-xs text-destructive">
              {callError}
            </div>
          )}

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

      <Dialog open={isCallOpen} onOpenChange={(open) => void handleCallDialogChange(open)}>
        <DialogContent className="max-w-6xl p-0 sm:max-w-6xl" showCloseButton>
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-base">
              Видеозвонок с {activeChat.participant.name}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[75dvh]">
            {activeCall ? (
              <JitsiMeeting
                domain="calls.disroot.org"
                roomName={activeCall.room_name}
                userInfo={{
                  displayName: auth?.user?.full_name || auth?.user?.username || "Bartery User",
                }}
                configOverwrite={{
                  prejoinPageEnabled: false,
                  startWithAudioMuted: false,
                  startWithVideoMuted: false,
                }}
                interfaceConfigOverwrite={{
                  MOBILE_APP_PROMO: false,
                }}
                onApiReady={(externalApi) => {
                  jitsiApiRef.current = externalApi
                  externalApi.addEventListener("readyToClose", () => {
                    void handleCallDialogChange(false)
                  })
                  externalApi.addEventListener("videoConferenceLeft", () => {
                    void handleCallDialogChange(false)
                  })
                }}
                getIFrameRef={(iframeRef) => {
                  iframeRef.style.width = "100%"
                  iframeRef.style.height = "100%"
                  iframeRef.style.border = "0"
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Подготовка звонка...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
