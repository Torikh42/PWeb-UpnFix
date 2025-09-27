"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Search,
  User,
  Calendar,
  MapPin,
  FolderSearch,
} from "lucide-react";

const StatusBadge = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs font-bold rounded-full tracking-wide";
  const statusClasses = {
    PENDING: "bg-red-600 text-white",
    DIPROSES: "bg-blue-100 text-blue-800",
    SELESAI: "bg-green-100 text-green-800",
  };
  return (
    <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>
  );
};

import DeleteButton from "@/components/DeleteButton";

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/reports?sortBy=newest"); 
        if (!response.ok) throw new Error("Gagal mengambil data laporan");
        const data = await response.json();
        setReports(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleStatusChange = async (reportId, newStatus) => {
    const originalReports = [...reports];
    const updatedReports = reports.map((r) =>
      r.id === reportId ? { ...r, status: newStatus } : r
    );
    setReports(updatedReports);

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Gagal memperbarui status");
    } catch (err) {
      setError(err.message);
      setReports(originalReports);
    }
  };

  const handleReportDeleted = (deletedReportId) => {
    setReports((prev) =>
      prev.filter((report) => report.id !== deletedReportId)
    );
  };

  const filteredReports = reports.filter((report) => {
    const matchesStatus =
      statusFilter === "ALL" || report.status === statusFilter;
    const matchesSearch =
      searchTerm === "" ||
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-lg text-gray-600">
            Kelola dan proses semua laporan yang masuk. (
            {filteredReports.length} laporan ditampilkan)
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                Cari Laporan
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  id="search"
                  type="text"
                  placeholder="Cari berdasarkan judul, pelapor, lokasi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="statusFilter"
                className="block text-sm font-semibold text-gray-700 mb-1.5"
              >
                Filter Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2.5 pl-3 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none text-gray-900"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">Pending</option>
                <option value="DIPROSES">Diproses</option>
                <option value="SELESAI">Selesai</option>
              </select>
            </div>
          </div>
        </div>
        {filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-lg flex flex-col overflow-hidden border border-gray-200"
              >
                <div className="relative w-full h-48 bg-gray-200">
                  <Image
                    src={report.image_url}
                    alt={report.title}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider">
                      {report.category}
                    </p>
                    <StatusBadge status={report.status} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 mb-3">
                    {report.title}
                  </h2>
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <p className="flex items-center">
                      <User size={14} className="mr-2" />
                      {report.full_name}
                    </p>
                    <p className="flex items-center">
                      <MapPin size={14} className="mr-2" />
                      {report.location}
                    </p>
                    <p className="flex items-center">
                      <Calendar size={14} className="mr-2" />
                      {new Date(report.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gray-200">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Ubah Status
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={report.status}
                        onChange={(e) =>
                          handleStatusChange(report.id, e.target.value)
                        }
                        className="flex-grow p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="DIPROSES">DIPROSES</option>
                        <option value="SELESAI">SELESAI</option>
                      </select>
                      <DeleteButton
                        reportId={report.id}
                        onReportDeleted={handleReportDeleted}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-8 bg-white rounded-xl shadow-lg border border-gray-200">
            <FolderSearch className="mx-auto h-24 w-24 text-gray-300" />
            <h2 className="mt-6 text-2xl font-bold text-gray-800">
              Tidak Ada Laporan Ditemukan
            </h2>
            <p className="mt-2 text-gray-600 max-w-md mx-auto">
              Coba sesuaikan filter Anda atau mungkin semua laporan sudah
              selesai ditangani.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
