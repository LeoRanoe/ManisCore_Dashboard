import { auth } from "./auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Public routes that don't require authentication
  const isPublicRoute = pathname === "/login" || pathname.startsWith("/api/auth")

  // Root path - redirect to login if not authenticated, dashboard if authenticated
  if (pathname === "/") {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", req.url)
      return NextResponse.redirect(loginUrl)
    } else {
      const dashboardUrl = new URL("/dashboard", req.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // If user is not logged in and trying to access protected route
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }

  // If user is logged in and trying to access login page, redirect to dashboard
  if (isLoggedIn && pathname === "/login") {
    const dashboardUrl = new URL("/dashboard", req.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
  ],
}
