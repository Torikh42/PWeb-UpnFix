"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  User,
  FileText,
  Plus,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function MobileMenuToggle({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        closeMenu();
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleMenu}
        className="p-2 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-opacity-50 z-40 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Mobile menu */}
      <div
        className={`fixed top-16 right-0 w-80 max-w-sm bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6">
          {/* User info section */}
          {user && (
            <div className="flex items-center space-x-3 pb-4 mb-4 border-b border-gray-200">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name || "User"}
                </p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Navigation links */}
          <div className="space-y-2">
            <Link
              href="/reports"
              onClick={closeMenu}
              className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
            >
              <FileText className="h-5 w-5" />
              <span className="font-medium">Laporan Publik</span>
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">Dashboard</span>
                </Link>

                <Link
                  href="/report/create"
                  onClick={closeMenu}
                  className="flex items-center space-x-3 px-3 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-200 mt-4"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Buat Laporan</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 px-3 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200 w-full text-left mt-4 border-t border-gray-200 pt-4"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200 mt-4"
                >
                  <LogIn className="h-5 w-5" />
                  <span className="font-medium">Login</span>
                </Link>

                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="flex items-center space-x-3 px-3 py-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors duration-200"
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="font-medium">Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
