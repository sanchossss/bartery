import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ADMIN_HOST = (process.env.NEXT_PUBLIC_ADMIN_HOST || "admin.localhost").toLowerCase()

/**
 * На хосте admin.localhost корень ведёт на приложение админки (/admin),
 * чтобы открывать http://admin.localhost:8080/ без префикса /admin в URL.
 */
export function middleware(request: NextRequest) {
  const rawHost = request.headers.get("host") || ""
  const host = rawHost.split(":")[0].toLowerCase()
  if (host !== ADMIN_HOST) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  if (pathname.startsWith("/admin")) {
    return NextResponse.next()
  }
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.startsWith("/uploads")) {
    return NextResponse.next()
  }
  if (pathname.match(/\.(ico|png|svg|webp|jpg|jpeg|gif|txt|xml|json|webmanifest)$/i)) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  if (pathname === "/") {
    url.pathname = "/admin"
    return NextResponse.rewrite(url)
  }
  url.pathname = "/admin" + pathname
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
