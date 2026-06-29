# UPNFIX - Aplikasi Pelaporan Fasilitas Kampus

## Laporan Resmi UAS Keamanan Jaringan
Laporan lengkap mengenai perancangan, analisis, dan pengujian sistem keamanan Layer 5-6-7 OSI pada UPNFIX dapat diakses langsung pada berkas:
📄 **[UAS_Kel7_Laporan_KeamananJaringan.pdf](file:///d:/PWeb-UpnFix/UAS_Kel7_Laporan_KeamananJaringan.pdf)** (Tersedia di root repositori ini).

---

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

    Salin berkas `.env.example` menjadi `.env` di direktori utama proyek dan lengkapi nilainya:

    ```bash
    cp .env.example .env
    ```

    Variabel lingkungan utama yang dibutuhkan meliputi:
    ```env
    DATABASE_URL=mysql://username:password@localhost:3306/database_name
    JWT_SECRET=your_jwt_secret_key_here
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
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
*   **Apache Fortress** - Sistem otorisasi RBAC granular (L7) terpusat berbasis LDAP untuk memotong celah Broken Access Control (BAC).
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
        *   **Konfigurasi Target Monitoring:**
            1. Buka **Monitor Center** -> Klik **New Monitor** (atau Add Monitor).
            2. **Aplikasi Next.js:** Pilih jenis `WEBSITE`, isi Target Host `upnfix-app`, Port `3000`, URI `/`, HTTPS `OFF` -> Klik `Save`.
            3. **API Gateway APISIX:** Pilih jenis `WEBSITE`, isi Target Host `apisix`, Port `9080`, URI `/health` *(wajib `/health` untuk menghindari error SSL redirect)*, HTTPS `OFF` -> Klik `Save`.
            4. **Database MySQL:** Pilih jenis `Database` -> `MySQL`, isi Target Host `upnfix-db`, Port `3306`, Database Name `upnfix`, Username `root`, Password `root123` -> Klik `Save` *(Driver JDBC MySQL sudah otomatis terpasang via volume mount)*.
            5. **LDAP Server (Fortress):** Pilih jenis `Service` -> `Port / Telnet`, isi Target Host `fortress-ldap`, Port `389` -> Klik `Save`.

---

## Panduan Pengujian Keamanan (Security Testing Guide)

Kami telah mempermudah proses evaluasi dengan menyediakan metode pengujian manual dan otomatis:

### A. Pengujian Otomatis (Automated Testing)
Kami menyediakan 2 skrip otomatis (berbasis `curl`) untuk mendemonstrasikan kondisi *Before* dan *After* penerapan API Gateway.

**Cara menjalankan:**
1. Buka terminal **Git Bash** di root proyek ini.
2. Untuk menguji kondisi **AFTER** (Sistem Aman / Lewat Apache APISIX Port 443):
   ```bash
   bash scripts/run-tests.sh
   ```
   *(Ekspektasi: Seluruh 9 Test akan `[PASS]` berwarna hijau).*

3. Untuk menguji kondisi **BEFORE** (Sistem Rentan / Bypass Langsung ke Next.js Port 3000):
   ```bash
   bash scripts/run-tests-bypass.sh
   ```
   *(Ekspektasi: Ditemukan celah kerentanan `[FAIL]` berwarna merah pada TLS dan Rate Limiting).*

### B. Pengujian Manual (REST Client)
Anda dapat melakukan uji coba satu per satu secara manual menggunakan ekstensi **REST Client** di VS Code. Kami telah memisahkan file pengujian untuk perbandingan yang lebih baik:

1. **[request-secure.rest](file:///d:/PWeb-UpnFix/request-secure.rest)**: Untuk pengujian sistem **Aman** melalui jalur APISIX (HTTPS).
2. **[request-nonsecure.rest](file:///d:/PWeb-UpnFix/request-nonsecure.rest)**: Untuk pengujian sistem **Rentan** melalui akses bypass (HTTP Port 3000).

**Langkah Pengujian:**
1. Install ekstensi **REST Client** di VS Code.
2. Konfigurasikan VS Code untuk mengabaikan error SSL localhost:
   * Buka VS Code *Settings* (`Ctrl + ,`).
   * Cari: `Rest-client: Exclude Hosts For SSL Verification`.
   * Klik *Add Item* dan masukkan `localhost`.
3. Buka salah satu file `.rest` di atas dan klik **"Send Request"** di atas method HTTP yang ingin diuji.

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