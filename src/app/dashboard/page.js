import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import db from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import DeleteButton from '@/components/DeleteButton';
import { MapPin, Calendar, FolderSearch } from "lucide-react";

// Fungsi untuk mengambil data laporan dari database (tidak ada perubahan)
async function getMyReports() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return [];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [reports] = await db.query(
      `SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC`,
      [decoded.id]
    );
    return reports;
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return [];
  }
}

// Komponen untuk status badge (desain sedikit disempurnakan)
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

export default async function DashboardPage() {
  const reports = await getMyReports();

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-lg text-gray-600">
            Lihat dan kelola semua laporan yang telah Anda buat.
          </p>
        </div>

        {/* Conditional Content */}
        {reports.length === 0 ? (
          <div className="text-center py-20 px-8 bg-white rounded-xl shadow-lg border border-gray-200">
            <FolderSearch className="mx-auto h-24 w-24 text-gray-300" />
            <h2 className="mt-6 text-2xl font-bold text-gray-800">
              Belum Ada Laporan
            </h2>
            <p className="mt-2 text-gray-600 max-w-md mx-auto">
              Sepertinya Anda belum membuat laporan apapun. Mari buat kampus
              menjadi tempat yang lebih baik!
            </p>
            <Link
              href="/report/create"
              className="mt-8 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-md"
            >
              Buat Laporan Pertama Anda
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reports.map((report) => (
              <div
                key={report.id}
                className="group bg-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col overflow-hidden border border-gray-200 relative"
              >
                <div className="absolute top-2 right-2 z-10">
                  <DeleteButton reportId={report.id} />
                </div>
                <div className="relative w-full h-48 overflow-hidden">
                  <Image
                    src={report.image_url}
                    alt={report.title}
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider">
                      {report.category}
                    </p>
                    <StatusBadge status={report.status} />
                  </div>
                  <h2
                    className="text-xl font-bold text-gray-800 mb-3 leading-tight"
                    title={report.title}
                  >
                    {report.title}
                  </h2>

                  <div className="mt-auto space-y-3 pt-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin size={16} className="mr-2 flex-shrink-0" />
                      <span>{report.location}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar size={14} className="mr-2 flex-shrink-0" />
                      <span>
                        {new Date(report.created_at).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "long", year: "numeric" }
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
