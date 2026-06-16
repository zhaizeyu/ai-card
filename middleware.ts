import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/.opencode.json") {
    return NextResponse.rewrite(new URL("/opencode.json", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/.opencode.json"],
}
