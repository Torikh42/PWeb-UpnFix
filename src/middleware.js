import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

export async function middleware(request) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api");

  // Halaman Auth (redirect jika sudah login)
  if (token && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  
  // Halaman Terproteksi (redirect ke login jika belum login)
  if (!token && (pathname.startsWith("/report/create") || pathname.startsWith("/dashboard"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Rute API & Admin Terproteksi
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/users")) {
    if (!token) {
      if (isApiRoute) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecretKey());
      
      // Role-based Access Control (Admin only)
      if (payload.role !== "ADMIN") {
        if (isApiRoute) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (err) {
      if (isApiRoute) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login', 
    '/signup', 
    '/report/create', 
    '/dashboard', 
    '/admin/:path*',
    '/api/users'
  ],
};
