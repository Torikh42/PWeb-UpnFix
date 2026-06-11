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

## Tumpukan Teknologi & Arsitektur Keamanan (Layer 5-6-7 OSI)

Aplikasi ini dideploy menggunakan **Docker Compose** dengan tumpukan teknologi keamanan berbasis proyek **Apache Software Foundation**:
*   **Next.js (v15.5.4)** & **MySQL (v8.0)** - Aplikasi inti UPNFIX.
*   **Apache APISIX (v3.10.0)** - API Gateway untuk TLS Termination (L6), Header Masking (L6), CORS (L7), dan Rate Limiting (L7).
*   **Apache SkyWalking (v9.5.0)** - Observability & Distributed Tracing (L7) untuk merekam dan menganalisis jejak request.
*   **Apache HertzBeat (v1.6.0)** - Uptime, Port, & Availability Monitoring (L7) dengan alarm otomatis.

---

## Menjalankan dengan Docker Compose (Rekomendasi UAS)

Untuk menjalankan seluruh tumpukan teknologi (database, aplikasi, API Gateway, dan sistem monitoring) secara kontainerisasi:

1.  **Siapkan Sertifikat SSL Lokal (Self-signed):**
    Pastikan file `cert.pem` dan `key.pem` sudah diletakkan di dalam folder [apisix_config/certs/](file:///d:/PWeb-UpnFix/apisix_config/certs/).
2.  **Jalankan Stack Docker:**
    ```bash
    docker compose up -d --build
    ```
3.  **Inisialisasi Konfigurasi Rute & Plugin APISIX:**
    ```bash
    bash scripts/setup-apisix.sh
    ```
4.  **Akses Layanan:**
    *   **Aplikasi Web (via Gateway):** `https://localhost` (Abaikan warning self-signed certificate di browser)
    *   **SkyWalking UI (Tracing):** `http://localhost:8080` *(Direkomendasikan buka di Jendela Penyamaran/Incognito untuk menghindari limit header cookie localhost)*
    *   **HertzBeat UI (Monitoring):** `http://localhost:1157` *(Username: `admin`, Password: `hertzbeat`)*

---

## Panduan Pengujian Keamanan (Security Testing Guide)

Kami telah mempermudah proses evaluasi dengan menyediakan metode pengujian manual dan otomatis:

### A. Pengujian Otomatis (Automated Testing)
Skrip otomatis menggunakan `curl` untuk menguji **9 skenario keamanan** pada Layer 5, 6, dan 7 OSI (termasuk Broken Access Control, SQL Injection, dan DDoS Rate Limiting).

**Cara menjalankan:**
1. Buka terminal **Git Bash** di root proyek ini.
2. Jalankan perintah:
   ```bash
   bash scripts/run-tests.sh
   ```
3. Skrip akan menampilkan laporan visual hijau `[PASS]` / merah `[FAIL]` untuk setiap celah keamanan.

### B. Pengujian Manual (REST Client)
Anda dapat melakukan uji coba satu per satu secara manual menggunakan file **[request.rest](file:///d:/PWeb-UpnFix/request.rest)**:

1. Install ekstensi **REST Client** di VS Code.
2. Konfigurasikan VS Code untuk mengabaikan error SSL localhost:
   * Buka VS Code *Settings* (`Ctrl + ,`).
   * Cari: `Rest-client: Exclude Hosts For SSL Verification`.
   * Klik *Add Item* dan masukkan `localhost`.
3. Buka file [request.rest](file:///d:/PWeb-UpnFix/request.rest) dan klik **"Send Request"** di atas method HTTP yang ingin diuji.

---

## Kredensial Pengujian Default

*   **Akun Admin UPNFIX (Database):**
    *   **Email:** `admin@upnfix.id`
    *   **Password:** `adminpassword`
    *   **Role:** `ADMIN`
*   **Akun User Biasa UPNFIX (Database):**
    *   **Email:** `budi@upnfix.id`
    *   **Password:** `password123`
    *   **Role:** `USER`
*   **Akun HertzBeat UI:**
    *   **Username:** `admin`
    *   **Password:** `hertzbeat` (Ubah setelah login pertama kali!)

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