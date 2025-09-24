"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  MapPin,
  Calendar,
  SlidersHorizontal,
  Search,
  FolderSearch,
  X,
} from "lucide-react";

// --- Helper Functions ---

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return `${seconds} detik yang lalu`;
  if (minutes < 60) return `${minutes} menit yang lalu`;
  if (hours < 24) return `${hours} jam yang lalu`;
  return `${days} hari yang lalu`;
}

// Komponen untuk status badge
const StatusBadge = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs font-bold rounded-full tracking-wide";
  const statusClasses = {
    PENDING: "bg-red-500 text-white",
    DIPROSES: "bg-blue-100 text-blue-800",
    SELESAI: "bg-green-100 text-green-800",
  };
  return (
    <span
      className={`${baseClasses} ${
        statusClasses[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
};

// --- Main Component ---

export default function FeedsPage() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // State untuk filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Efek untuk mengambil data laporan
  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reports?sortBy=newest`);
        if (!res.ok) throw new Error("Gagal mengambil data laporan");
        const data = await res.json();
        setReports(data);
      } catch (err) {
        setError(err.message);
        console.error("Failed to fetch reports", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  // Logika untuk filter laporan
  const filteredReports = reports.filter((report) => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch =
      report.title.toLowerCase().includes(searchTermLower) ||
      report.description.toLowerCase().includes(searchTermLower) ||
      report.location.toLowerCase().includes(searchTermLower) ||
      report.full_name.toLowerCase().includes(searchTermLower);

    const matchesStatus =
      statusFilter === "ALL" || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Komponen Panel Filter (untuk reusability)
  const FilterPanel = () => (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari laporan..."
          className="pl-10 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-gray-700">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="mt-1.5 w-full py-2 pl-3 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none text-gray-900"
        >
          <option value="ALL">Semua Status</option>
          <option value="PENDING">Pending</option>
          <option value="DIPROSES">Diproses</option>
          <option value="SELESAI">Selesai</option>
        </select>
      </div>
    </div>
  );

  if (isLoading && reports.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* --- Mobile Filter Drawer --- */}
      {isFilterOpen && (
        // PERUBAHAN DI SINI: kelas bg-black bg-opacity-50 dihapus
        <div
          className="fixed inset-0 z-30 lg:hidden"
          onClick={() => setIsFilterOpen(false)}
        ></div>
      )}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white p-6 border-r z-40 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isFilterOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <SlidersHorizontal className="mr-3" /> Filter
          </h2>
          <button onClick={() => setIsFilterOpen(false)} className="p-1">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        <FilterPanel />
      </div>

      {/* --- Desktop Sidebar Filter --- */}
      <aside className="w-72 p-6 border-r bg-white h-screen sticky top-0 hidden lg:block">
        <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
          <SlidersHorizontal className="mr-3" /> Filter Laporan
        </h2>
        <FilterPanel />
      </aside>

      {/* --- Main Content Feed --- */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* Tombol Filter untuk Mobile */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-lg bg-white text-gray-700 font-semibold shadow-sm"
          >
            <SlidersHorizontal className="mr-2 h-5 w-5" />
            Tampilkan Filter
          </button>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col"
              >
                <div className="p-5 flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-bold text-gray-800">
                        {report.full_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTimeAgo(report.created_at)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
                <div className="px-5 pb-5 flex-grow">
                  <h3 className="text-lg font-bold mb-2 text-gray-900">
                    {report.title}
                  </h3>
                  <p className="text-gray-600 mb-3 text-sm">
                    {report.description}
                  </p>
                  <div className="text-xs text-gray-500 flex items-center">
                    <MapPin size={14} className="mr-2" />
                    {report.location}
                  </div>
                </div>
                {report.image_url && (
                  <div className="relative w-full h-80 bg-gray-200">
                    <Image
                      src={report.image_url}
                      alt={report.title}
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-20 px-8 bg-white rounded-xl shadow-lg border border-gray-200">
              <FolderSearch className="mx-auto h-24 w-24 text-gray-300" />
              <h2 className="mt-6 text-2xl font-bold text-gray-800">
                Tidak Ada Laporan Ditemukan
              </h2>
              <p className="mt-2 text-gray-600 max-w-md mx-auto">
                Coba sesuaikan filter pencarian Anda.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
