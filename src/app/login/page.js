"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Login gagal. Periksa kembali email dan password Anda."
        );
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="flex flex-col md:flex-row w-full max-w-4xl lg:max-w-5xl bg-white shadow-2xl rounded-xl overflow-hidden">
        {/* Kolom Gambar */}
        <div className="hidden md:flex md:w-1/2 overflow-hidden relative">
          <Image
            src="/assets/UPN1.jpg"
            alt="UPN Veteran Jakarta Campus"
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </div>

        {/* Kolom Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 lg:p-12 flex items-center justify-center">
          <div className="w-full max-w-md">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <h1 className="font-bold text-3xl tracking-wide text-gray-800 mb-2">
                  LOGIN
                </h1>
                <p className="text-gray-600">
                  Selamat datang kembali! Silakan masuk.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    className="block text-zinc-600 font-semibold text-sm mb-1.5"
                    htmlFor="email-login"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <input
                      id="email-login"
                      className={`shadow-sm appearance-none border ${
                        error
                          ? "border-red-500 ring-1 ring-red-500"
                          : "border-gray-300"
                      } rounded-lg w-full py-3 pl-10 pr-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 transition-colors`}
                      type="email"
                      placeholder="Masukkan email Anda"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-zinc-600 font-semibold text-sm mb-1.5"
                    htmlFor="password-login"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <input
                      id="password-login"
                      className={`shadow-sm appearance-none border ${
                        error
                          ? "border-red-500 ring-1 ring-red-500"
                          : "border-gray-300"
                      } rounded-lg w-full py-3 pl-10 pr-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400 transition-colors`}
                      type="password"
                      placeholder="Masukkan password Anda"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rememberMe" className="ml-2 text-gray-700">
                    Ingat saya
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? "Masuk..." : "Masuk"}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Belum punya akun?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
                  >
                    Daftar di sini
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
