import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar"; // Pastikan path import benar

// Konfigurasi font Inter
const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Memastikan teks terlihat saat font sedang dimuat
  variable: "--font-inter", // Membuat variabel CSS untuk font ini
});

export const metadata = {
  title: "UPNFix | Lapor Kerusakan UPNVJ", // Judul yang lebih deskriptif
  description: "Aplikasi Pelaporan Kerusakan Infrastruktur UPNVJ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      {/* Menambahkan variabel font ke body.
        'antialiased' membuat font terlihat lebih halus.
      */}
      <body
        className={`${inter.variable} font-sans antialiased bg-gray-50 text-gray-900`}
      >
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
