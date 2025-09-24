import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default async function Navbar() {
  let user = null;

  try {
    // Await cookies() sesuai dengan requirement Next.js 15
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token");

    // Jika cookie ada, verifikasi token
    if (tokenCookie && tokenCookie.value) {
      const decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET);
      user = decoded;
    }
  } catch (error) {
    // Jika ada error (token invalid, dll), user tetap null
    console.error("Auth error:", error.message);
    user = null;
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            UPNFIX
          </Link>
          <Link
            href="/reports"
            className="text-sm font-medium text-gray-700 hover:text-indigo-600"
          >
            Laporan Publik
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            // Tampilan jika user sudah login
            <>
              <span className="text-gray-700">
                Halo, <span className="font-semibold">{user.email}</span>!
              </span>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Dashboard
              </Link>
              <Link
                href="/report/create"
                className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Buat Laporan
              </Link>
              <LogoutButton />
            </>
          ) : (
            // Tampilan jika user belum login
            <>
              <Link
                href="/login"
                className="px-4 py-2 font-semibold text-gray-800 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
