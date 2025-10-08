# UPNFIX - Aplikasi Pelaporan Fasilitas Kampus

UPNFIX adalah sebuah platform pelaporan berbasis web yang dirancang untuk memudahkan mahasiswa dan staf di lingkungan UPN "Veteran" Jakarta melaporkan berbagai masalah terkait fasilitas kampus. Mulai dari kerusakan infrastruktur, masalah kebersihan, hingga saran perbaikan, semua dapat dilaporkan dengan mudah melalui aplikasi ini. Laporan yang masuk akan dikelola oleh administrator untuk ditindaklanjuti, menciptakan lingkungan kampus yang lebih baik, responsif, dan terawat.

## Memulai

Petunjuk ini akan membantu Anda menjalankan salinan proyek di mesin lokal untuk tujuan pengembangan dan pengujian.

### Prasyarat

*   Node.js (v18.x atau lebih baru)
*   npm, yarn, atau pnpm
*   MySQL

### Instalasi

1.  **Kloning repositori**
    ```bash
    git clone <url-repositori-anda>
    cd upn-fix
    ```

2.  **Instal dependensi**
    ```bash
    npm install
    # atau
    yarn install
    # atau
    pnpm install
    ```

3.  **Siapkan variabel lingkungan**

    Buat berkas `.env.local` di direktori utama proyek dan tambahkan variabel lingkungan berikut. Anda dapat menyalin dari berkas `.env.example` jika ada.

    ```
    DB_HOST=
    DB_USER=
    DB_PASSWORD=
    DB_NAME=
    JWT_SECRET=
    CLOUDINARY_CLOUD_NAME=
    CLOUDINARY_API_KEY=
    CLOUDINARY_API_SECRET=
    ```

4.  **Inisialisasi basis data**

    Jalankan skrip berikut untuk menginisialisasi skema basis data:

    ```bash
    node scripts/init-db.js
    ```

5.  **Jalankan server pengembangan**
    ```bash
    npm run dev
    ```

    Buka [http://localhost:3000](http://localhost:3000) di peramban Anda untuk melihat hasilnya.

## Tumpukan Teknologi

*   [Next.js](https://nextjs.org/) - Kerangka kerja React untuk pengembangan web
*   [React](https://reactjs.org/) - Pustaka JavaScript untuk membangun antarmuka pengguna
*   [Tailwind CSS](https://tailwindcss.com/) - Kerangka kerja CSS utility-first
*   [MySQL](https://www.mysql.com/) - Basis data relasional
*   [bcryptjs](https://www.npmjs.com/package/bcryptjs) - Untuk hashing kata sandi
*   [jose](https://www.npmjs.com/package/jose) - Untuk penandatanganan dan verifikasi JWT
*   [Cloudinary](https://cloudinary.com/) - Untuk manajemen gambar dan video

## Skrip yang Tersedia

Di direktori proyek, Anda dapat menjalankan:

-   `npm run dev`: Menjalankan aplikasi dalam mode pengembangan.
-   `npm run build`: Membangun aplikasi untuk produksi.
-   `npm run start`: Memulai server produksi.
-   `npm run lint`: Menjalankan linter.

## Struktur Proyek

    .
    ├── public
    ├── scripts
    │   └── init-db.js
    └── src
        ├── app
        ├── components
        └── lib
            └── db.js

*   `src/app`: Berisi semua rute dan halaman.
*   `src/components`: Berisi semua komponen yang dapat digunakan kembali.
*   `src/lib`: Berisi logika koneksi basis data.
*   `scripts/init-db.js`: Skrip untuk menginisialisasi basis data.

## Berkontribusi

Silakan baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk detail tentang kode etik kami, dan proses untuk mengirimkan pull request kepada kami.