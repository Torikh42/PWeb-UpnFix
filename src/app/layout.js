import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar"; 

const inter = Inter({
  subsets: ["latin"],
  display: "swap", 
  variable: "--font-inter", 
});

export const metadata = {
  title: "UPNFix | Lapor Kerusakan UPNVJ", 
  description: "Aplikasi Pelaporan Kerusakan Infrastruktur UPNVJ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} font-sans antialiased bg-gray-50 text-gray-900`}
      >
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
