"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Refresh halaman untuk memperbarui status login di server component
      router.refresh();
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
    >
      Logout
    </button>
  );
}
