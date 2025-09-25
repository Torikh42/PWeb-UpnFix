"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  FileText,
  MessageSquare,
  MapPin,
  LayoutGrid,
  Camera,
  AlertCircle,
} from "lucide-react";

const categories = [
  "LISTRIK",
  "AIR",
  "BANGUNAN",
  "FASILITAS",
  "INTERNET",
  "LAINNYA",
];

export default function CreateReportPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Foto kerusakan wajib diunggah.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("location", location);
    formData.append("category", category);
    formData.append("file", file);

    try {
      const res = await fetch("/api/reports/create", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat laporan");
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
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Laporkan Kerusakan Fasilitas
        </h1>
        <p className="text-gray-600 mb-8">
          Sampaikan laporan Anda agar dapat segera kami tindaklanjuti.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Judul Laporan */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Judul Laporan
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-gray-900"
                placeholder="Contoh: Lampu koridor mati"
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Deskripsi Kerusakan
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <textarea
                id="description"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-gray-900"
                placeholder="Jelaskan detail kerusakan di sini..."
              ></textarea>
            </div>
          </div>

          {/* Lokasi */}
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Lokasi
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-gray-900"
                placeholder="Contoh: Gedung FIK, Lantai 4"
              />
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-semibold text-gray-700 mb-1.5"
            >
              Kategori
            </label>
            <div className="relative">
              <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <select
                id="category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none transition text-gray-900"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Foto Kerusakan
            </label>
            <label 
              htmlFor="file-upload"
              className="mt-2 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-indigo-500 transition-colors"
            >
              <div className="space-y-1 text-center">
                {preview ? (
                  <div className="relative w-full max-w-xs mx-auto">
                    <Image
                      src={preview}
                      alt="Preview"
                      width={400}
                      height={300}
                      className="rounded-md object-contain"
                    />
                    <span className="mt-4 block text-sm font-medium text-indigo-600 hover:text-indigo-500">Ganti gambar</span>
                  </div>
                ) : (
                  <>
                    <Camera className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-indigo-600">
                        Unggah file
                      </span>{" "}
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
                  </>
                )}
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  required
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </div>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Tombol Submit */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Mengirim Laporan..." : "Kirim Laporan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
