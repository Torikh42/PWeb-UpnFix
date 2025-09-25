import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import MobileMenuToggle from "./MobileMenuToogle";

export default async function Navbar() {
  let user = null;

  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token");

    if (tokenCookie && tokenCookie.value) {
      const decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET);
      user = decoded;
    }
  } catch (error) {
    console.error("Auth error:", error.message);
    user = null;
  }

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50 border-b border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
            >
              UPNFIX
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Navigation Links */}
            <div className="flex items-center space-x-6">
              <Link
                href="/reports"
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200 relative group"
              >
                Laporan Publik
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 group-hover:w-full transition-all duration-200"></span>
              </Link>

              {user && (
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200 relative group"
                >
                  Dashboard
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 group-hover:w-full transition-all duration-200"></span>
                </Link>
              )}
            </div>

            {/* User Section */}
            <div className="flex items-center space-x-4 pl-6 border-l border-gray-200">
              {user ? (
                <>
                  <div className="text-sm text-gray-600">
                    Halo,{" "}
                    <span className="font-semibold text-gray-800">
                      {user.email}
                    </span>
                  </div>
                  <Link
                    href="/report/create"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    Buat Laporan
                  </Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-indigo-600 font-medium transition-colors duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <MobileMenuToggle user={user} />
          </div>
        </div>
      </div>
    </nav>
  );
}
