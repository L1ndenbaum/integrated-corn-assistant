import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const isAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTH_GUARD !== "false"

export function middleware(request: NextRequest) {
  if (!isAuthEnabled) {
    return NextResponse.next()
  }

  const token = request.cookies.get("access_token")?.value
  if (token) {
    return NextResponse.next()
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = "/auth/login"
  loginUrl.searchParams.set("returnUrl", request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/dashboard/:path*", "/qa/:path*", "/diagnosis/:path*"],
}
