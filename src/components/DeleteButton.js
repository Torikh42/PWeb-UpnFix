"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

export default function DeleteButton({ reportId, onReportDeleted }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const executeDelete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus laporan");
      }
      if (onReportDeleted) {
        onReportDeleted(reportId);
      } else {
        router.refresh();
      }
      
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsConfirmOpen(true)}
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
