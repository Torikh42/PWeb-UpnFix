"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog"; // Import komponen baru

export default function DeleteButton({ reportId }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false); // State untuk modal

  const executeDelete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus laporan");
      }

      // Refresh halaman untuk memperbarui daftar laporan
      router.refresh();
    } catch (error) {
      // Untuk saat ini kita masih gunakan alert untuk error,
      // ini bisa diganti dengan komponen notifikasi/toast kustom di lain waktu.
      alert(error.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsConfirmOpen(true)} // Buka modal saat di-klik
        disabled={isLoading}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors disabled:cursor-not-allowed"
        title="Hapus Laporan"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Trash2 className="h-5 w-5" />
        )}
      </button>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Hapus Laporan"
      >
        Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak bisa
        dibatalkan.
      </ConfirmDialog>
    </>
  );
}
