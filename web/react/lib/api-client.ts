const AUTH_KEY = "skills_exchange_auth"

export type ApiUser = {
  id: number
  username: string
  email?: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  role?: string
  points?: number
}

export type StoredAuth = {
  token: string
  user: ApiUser
}

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredAuth
    if (!data?.token || !data?.user?.id) return null
    return data
  } catch {
    return null
  }
}

export function setStoredAuth(data: StoredAuth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data))
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_KEY)
}

/** Backend origin for absolute URLs (avatars, server-side fetch). */
export function getBackendOrigin(): string {
  // Server runtime can use an internal Docker network URL.
  if (typeof window === "undefined") {
    if (typeof process.env.API_BACKEND_URL === "string" && process.env.API_BACKEND_URL) {
      return process.env.API_BACKEND_URL.replace(/\/$/, "")
    }
  }
  if (typeof process.env.NEXT_PUBLIC_API_ORIGIN === "string" && process.env.NEXT_PUBLIC_API_ORIGIN) {
    return process.env.NEXT_PUBLIC_API_ORIGIN.replace(/\/$/, "")
  }
  return "http://localhost:8080"
}

export function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith("http")) return path
  return `${getBackendOrigin()}${path.startsWith("/") ? "" : "/"}${path}`
}

/**
 * Browser: relative `/api/...` (Next rewrites to backend).
 * Server: absolute URL to backend.
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`
  if (typeof window !== "undefined") {
    return p.startsWith("/api") || p.startsWith("/uploads") ? p : `/api${p.replace(/^\/api/, "")}`
  }
  const base = getBackendOrigin()
  if (p.startsWith("/api")) return `${base}${p}`
  return `${base}/api${p.replace(/^\/api/, "")}`
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers: h, ...rest } = init
  const headers = new Headers(h)
  const body = rest.body
  if (body && typeof body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const auth = token === undefined ? getStoredAuth()?.token : token
  if (auth) headers.set("Authorization", `Bearer ${auth}`)

  const url = apiUrl(path)
  const res = await fetch(url, { ...rest, headers })
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = { error: text }
    }
  }
  if (!res.ok) {
    const err = (data as { error?: string })?.error || res.statusText || "Request failed"
    throw new Error(err)
  }
  return data as T
}
