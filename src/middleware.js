import { NextResponse } from "next/server";

export function middleware(request) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Jika user sudah login, jangan biarkan mereka akses /login atau /signup
  if (
    token &&
    (pathname.startsWith("/login") || pathname.startsWith("/signup"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Jika user belum login, jangan biarkan mereka akses halaman yang dilindungi
  if (!token && (pathname.startsWith('/report/create') || pathname.startsWith('/dashboard'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/signup', '/report/create', '/dashboard'],
};
