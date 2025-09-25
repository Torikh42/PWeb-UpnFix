import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, MessageSquare, Send } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-white text-gray-800">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] lg:h-[80vh] flex items-center justify-center text-center text-white px-6">
        {/* Background Image */}
        <Image
          src="/assets/UPN1.jpg"
          alt="Kampus UPN Veteran Jakarta"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 drop-shadow-md">
            Solusi Cepat Pelaporan Kampus
          </h1>
          <p className="text-lg md:text-xl drop-shadow-sm mb-8">
            Laporkan kerusakan fasilitas dengan mudah dan pantau proses
            perbaikannya secara transparan untuk UPNVJ yang lebih baik.
          </p>
          <Link
            href="/report/create"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
          >
            Buat Laporan Sekarang
          </Link>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-3">Bagaimana Caranya?</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-12">
            Hanya butuh tiga langkah mudah untuk membuat perubahan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center">
              <div className="bg-indigo-100 text-indigo-600 rounded-full p-5 mb-4">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Laporkan</h3>
              <p className="text-gray-600">
                Isi formulir laporan dengan detail kerusakan dan unggah foto
                jika diperlukan.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-indigo-100 text-indigo-600 rounded-full p-5 mb-4">
                <Send size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Diproses</h3>
              <p className="text-gray-600">
                Laporan Anda akan diverifikasi dan diteruskan ke pihak terkait
                untuk ditindaklanjuti.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-indigo-100 text-indigo-600 rounded-full p-5 mb-4">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Selesai</h3>
              <p className="text-gray-600">
                Pantau status laporan Anda hingga masalah terselesaikan dan
                kampus kembali nyaman.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Contoh Laporan dari Rekan Mahasiswa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group relative overflow-hidden rounded-lg shadow-lg transform hover:-translate-y-2 transition-transform duration-300">
              <Image
                src="/assets/problem1.jpg"
                alt="Kerusakan fasilitas kampus"
                width={500}
                height={350}
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-black/40 flex items-end p-4">
                <p className="text-white font-semibold">
                  WC di Toilet Masjid Rusak
                </p>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-lg shadow-lg transform hover:-translate-y-2 transition-transform duration-300">
              <Image
                src="/assets/Jendela-Parkir.jpg"
                alt="Jendela pecah di area parkir"
                width={500}
                height={350}
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-black/40 flex items-end p-4">
                <p className="text-white font-semibold">
                  Lahan Parkiran yang Selalu Penuh
                </p>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-lg shadow-lg transform hover:-translate-y-2 transition-transform duration-300">
              <Image
                src="/assets/UPN2.webp"
                alt="Suasana kampus UPN"
                width={500}
                height={350}
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-black/40 flex items-end p-4">
                <p className="text-white font-semibold">
                  Menjaga keindahan dan fungsi fasilitas bersama.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-indigo-700 text-white">
        <div className="container mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Siap Membuat Kampus Lebih Baik?
          </h2>
          <p className="max-w-xl mx-auto mb-8">
            Setiap laporan Anda sangat berarti untuk kenyamanan kita bersama.
            Jangan ragu, laporkan sekarang!
          </p>
          <Link
            href="/report/create"
            className="bg-white text-indigo-700 font-bold py-3 px-8 rounded-lg text-lg hover:bg-gray-200 transition-transform transform hover:scale-105"
          >
            Laporkan Masalah
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-6 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} UPNFix. All rights reserved.</p>
          <p className="mt-1 text-gray-400">
            Sebuah inisiatif untuk UPN Veteran Jakarta.
          </p>
        </div>
      </footer>
    </div>
  );
}
