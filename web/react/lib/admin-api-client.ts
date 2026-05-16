import { apiUrl } from "@/lib/api-client"

const ADMIN_TOKEN_KEY = "bartery_admin_jwt"

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getAdminToken()
  const headers = new Headers(init.headers)
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const p = path.startsWith("/") ? path : `/${path}`
  const url = typeof window !== "undefined" ? p : apiUrl(p)

  const res = await fetch(url, { ...init, headers })
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = { error: text }
    }
  }
  if (res.status === 401) {
    clearAdminToken()
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
      window.location.assign("/admin/login")
    }
  }
  if (!res.ok) {
    const err = (data as { error?: string })?.error || res.statusText || "Request failed"
    throw new Error(err)
  }
  return data as T
}
