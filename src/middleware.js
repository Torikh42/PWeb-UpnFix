import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;
  if (
    token &&
    (pathname.startsWith("/login") || pathname.startsWith("/signup"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (!token && (pathname.startsWith('/report/create') || pathname.startsWith('/dashboard'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecretKey());
      if (payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (err) {
      console.error("JWT verification error:", err);
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/signup', '/report/create', '/dashboard', '/admin/:path*'],
};
