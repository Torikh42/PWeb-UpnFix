# Naskah Presentasi & Panduan Ujian Akhir Semester (UAS)
**Mata Kuliah:** Keamanan Jaringan  
**Proyek:** UPNFIX - Aplikasi Pelaporan Fasilitas Kampus  
**Teknologi:** Next.js, MySQL, Apache APISIX, Apache Fortress LDAP, Apache SkyWalking, Apache HertzBeat

---

## BAGIAN A: Script Presentasi Per Slide (Maksimal 10 Slide)

### Slide 1: Judul dan Anggota Kelompok
*   **Visual Slide:** Judul Proyek: "Penerapan Apache APISIX, Apache Fortress, dan Apache SkyWalking untuk Pengamanan API pada Sistem Informasi UPNFIX", Logo UPNVJ, Nama Anggota Kelompok & NIM.
*   **Script Presentasi (Pembuka):**
    > *"Selamat pagi/siang Pak Wayan dan teman-teman sekalian. Hari ini kami dari kelompok [Nama Kelompok] akan mempresentasikan proyek UAS Keamanan Jaringan kami yang berjudul **UPNFIX - Aplikasi Pelaporan Fasilitas Kampus berbasis Next.js & MySQL yang Diamankan dengan Teknologi Apache Foundation**. Di sini kami fokus menerapkan prinsip Defense in Depth pada lapisan atas OSI, yaitu Layer 5, 6, dan 7."*

### Slide 2: Deskripsi Studi Kasus (UPNFIX)
*   **Visual Slide:** Tangkapan layar UI aplikasi UPNFIX, daftar peran (Mahasiswa/Staf sebagai Pelapor, Administrator sebagai Pengelola), alur pelaporan fasilitas.
*   **Script Presentasi:**
    > *"UPNFIX adalah platform pelaporan fasilitas kampus untuk civitas akademika UPNVJ. Aplikasi ini memungkinkan pengguna melaporkan kerusakan sarana prasarana. Mengapa keamanan di sini krusial? Karena sistem memproses data sensitif seperti data pribadi mahasiswa, bukti foto kerusakan, log laporan, serta memiliki hak akses administratif yang jika bocor atau disalahgunakan dapat merusak integritas data kampus."*

### Slide 3: Identifikasi Aset & Ancaman Keamanan
*   **Visual Slide:** Tabel Identifikasi Aset & Ancaman. Aset: Data pengguna (Confidentiality), Token sesi (Confidentiality), API Transaksi (Integrity/Availability), Log (Integrity). Ancaman: BAC, Session Hijacking, DoS/Request Flooding, MITM.
*   **Script Presentasi:**
    > *"Sebagai analis keamanan, kami mengidentifikasi beberapa ancaman utama. Pada **Layer 5**, ada ancaman *Session Hijacking* dan *Brute Force*. Pada **Layer 6**, ada risiko *Data Leakage* dan penyadapan karena lalu lintas HTTP tanpa enkripsi (*Man-in-the-Middle*). Serta pada **Layer 7**, ancaman *Broken Access Control* di mana user biasa mem-bypass API admin, dan *Request Flooding* (DoS) yang dapat melumpuhkan layanan."*

### Slide 4: Pemetaan OSI Layer 5-6-7
*   **Visual Slide:** Diagram lapisan OSI 5, 6, 7 dengan kontrol keamanan masing-masing.
    *   Layer 5 (Session): Autentikasi JWT, session timeout, penanganan logout.
    *   Layer 6 (Presentation): TLS Termination, Hiding Server Signature (Header Masking), regex input escaping.
    *   Layer 7 (Application): Granular RBAC (Fortress LDAP), Rate Limiting (APISIX plugin), Observability (SkyWalking & HertzBeat).
*   **Script Presentasi:**
    > *"Untuk mengamankan sistem, kami memetakan kontrol keamanan pada model OSI. Di **Layer 5 (Session)**, kami mengelola siklus sesi menggunakan JWT dengan masa kedaluwarsa ketat. Di **Layer 6 (Presentation)**, enkripsi HTTPS ditegakkan di tepi jaringan untuk melindungi data transit. Di **Layer 7 (Application)**, otorisasi dipusatkan menggunakan LDAP, dan traffic disaring dengan rate limiter untuk mencegah penyalahgunaan API."*

### Slide 5: Teknologi Apache yang Digunakan
*   **Visual Slide:** Logo & Fungsi:
    *   **Apache APISIX**: API Gateway (TLS Termination, Rate Limiting, Header Hiding).
    *   **Apache Fortress**: Otorisasi granular berbasis RBAC & LDAP.
    *   **Apache SkyWalking**: Distributed tracing & telemetri request.
    *   **Apache HertzBeat**: Monitoring availability server & alerting.
*   **Script Presentasi:**
    > *"Kami memilih 4 teknologi open-source Apache yang saling melengkapi. **APISIX** bertindak sebagai perisai terluar untuk meredam serangan traffic dan enkripsi TLS. **Fortress** memusatkan kebijakan otorisasi pengguna. Sementara itu, untuk memastikan visibilitas sistem, kami menggunakan **SkyWalking** untuk melacak jejak request (tracing) dan **HertzBeat** untuk memantau status kesehatan (uptime) dari setiap kontainer."*

### Slide 6: Arsitektur Keamanan & Topologi Jaringan
*   **Visual Slide:** Diagram arsitektur kontainer Docker (`upnfix-net`). Menunjukkan Client -> APISIX (port 443) -> Next.js App (port 3000) -> MySQL & LDAP. HertzBeat & SkyWalking memantau dari samping.
*   **Script Presentasi:**
    > *"Berikut adalah diagram deployment kami. Seluruh kontainer berada di dalam jaringan virtual terisolasi `upnfix-net`. Client dari luar tidak dapat mengakses langsung database MySQL atau server Next.js. Satu-satunya pintu masuk publik adalah port 443 pada Apache APISIX. APISIX bertindak sebagai reverse proxy yang meneruskan request ke aplikasi Next.js setelah memvalidasi keamanan request tersebut."*

### Slide 7: Implementasi Simulasi & Konfigurasi
*   **Visual Slide:** Snippet konfigurasi Docker Compose, konfigurasi route/plugin APISIX (`limit-count`), dan middleware Next.js.
*   **Script Presentasi:**
    > *"Simulasi ini diimplementasikan menggunakan kontainer Docker. Konfigurasi rute APISIX didefinisikan secara deklaratif di etcd. Kami mengaktifkan plugin `limit-count` pada APISIX untuk membatasi request maksimal 10 per menit per IP untuk endpoint login. Pada sisi aplikasi Next.js, kami mengimplementasikan middleware untuk memverifikasi JWT token secara konsisten sebelum merespons request data."*

### Slide 8: Demo Pengujian Otomatis
*   **Visual Slide:** Cuplikan eksekusi pengujian aman (`run-tests.sh` dengan 9 PASS) vs bypass (`run-tests-bypass.sh` dengan 2 FAIL).
*   **Script Presentasi:**
    > *"Kami melakukan pengujian otomatis menggunakan script pengujian berbasis curl. Kami akan mendemonstrasikan dua skenario: skenario aman melewati API Gateway, dan skenario bypass di mana penyerang mencoba mengakses server aplikasi secara langsung. Mari kita lihat demonya."* (Lanjut ke demo langsung).

### Slide 9: Evaluasi Sebelum vs Sesudah
*   **Visual Slide:** Tabel perbandingan Sebelum vs Sesudah Keamanan diterapkan.
    *   Brute Force: Tidak dibatasi -> Dibatasi (APISIX 429).
    *   Akses API Tanpa Token/Role salah: Lolos -> Ditolak (Middleware & Fortress LDAP).
    *   Penyadapan Trafik: Terbuka (HTTP) -> Terekripsi (HTTPS).
    *   Downtime: Tidak terdeteksi -> Alert aktif (HertzBeat).
*   **Script Presentasi:**
    > *"Dari tabel evaluasi ini terlihat jelas perbedaan tingkat keamanan sistem. Sebelum diamankan, celah seperti SQL Injection, brute force, dan bypass otorisasi sangat terbuka lebar. Setelah arsitektur Apache diterapkan, seluruh ancaman tersebut berhasil dimitigasi di tepi jaringan (gateway) maupun di level aplikasi."*

### Slide 10: Kesimpulan & Rekomendasi Masa Depan
*   **Visual Slide:** Poin-poin kesimpulan dan rekomendasi: WAF (Web Application Firewall), integrasi alert ke Telegram/Slack, Audit log tersentralisasi.
*   **Script Presentasi (Penutup):**
    > *"Kesimpulannya, integrasi teknologi Apache Foundation sangat efektif melindungi Layer 5, 6, dan 7. Untuk pengembangan ke depan, kami merekomendasikan penambahan Web Application Firewall (WAF) seperti Apache APISIX Chaitin WAF plugin, serta mengintegrasikan alert HertzBeat langsung ke webhook Telegram administrator. Terima kasih, kami persilakan jika ada pertanyaan dari Pak Wayan."*

---

## BAGIAN B: Panduan Demonstrasi Live (Untuk Mahasiswa)

1.  **Langkah 1: Tunjukkan Seluruh Container Berjalan**
    *   Buka terminal, jalankan perintah:
        ```bash
        docker compose ps
        ```
    *   Jelaskan ke dosen: *"Pak, di sini kami menjalankan 8 kontainer yang terisolasi dalam satu jaringan, termasuk APISIX, Fortress, database MySQL, Next.js, SkyWalking, dan HertzBeat."*
2.  **Langkah 2: Jalankan Pengujian Aman (9 PASS)**
    *   Jalankan script pengujian aman:
        ```powershell
        & "C:\Program Files\Git\bin\bash.exe" scripts/run-tests.sh
        ```
    *   Jelaskan ke dosen: *"Saat request melewati gerbang APISIX (port 443/HTTPS), semua uji keamanan lolos (9 PASS). Rate limiting memblokir request ke-11 dengan status `429 Too Many Requests`, dan SQL injection diblokir oleh validasi input."*
3.  **Langkah 3: Jalankan Pengujian Bypass (7 PASS, 2 FAIL)**
    *   Jalankan script bypass:
        ```powershell
        & "C:\Program Files\Git\bin\bash.exe" scripts/run-tests-bypass.sh
        ```
    *   Jelaskan ke dosen: *"Jika penyerang berhasil membypass gateway dan menembak langsung port Next.js (port 3000/HTTP), maka pengujian TLS dan Rate Limiting akan FAILED (merah). Ini membuktikan pentingnya menempatkan API Gateway di depan aplikasi."*
4.  **Langkah 4: Tunjukkan Dasbor HertzBeat & SkyWalking**
    *   Buka browser ke `http://localhost:1157` (HertzBeat). Tunjukkan status hijau (UP) dari kontainer Next.js, APISIX, dan MySQL. Jelaskan bahwa HertzBeat terus melakukan polling aktif.
    *   Buka browser ke `http://localhost:8080` (SkyWalking). Tunjukkan grafik tracing request yang masuk ke APISIX. Jelaskan bahwa SkyWalking merekam setiap jejak request user secara pasif.

---

## BAGIAN C: Kunci Jawaban 4 Soal UAS Utama

Berikut adalah panduan jawaban jika dosen menanyakan pertanyaan spesifik dari lembar soal UAS:

### Soal 1: Kebutuhan keamanan dan evaluasi teknologi Apache untuk Layer 5, 6, dan 7.
*   **Jawaban Konten:**
    *   **Layer 5 (Session):** Kebutuhan utama adalah manajemen sesi aman agar token tidak dicuri (*session hijacking*). Evaluasi kami memilih **Apache APISIX** untuk mengelola rute sesi dan validasi JWT token di edge.
    *   **Layer 6 (Presentation):** Kebutuhan utama adalah enkripsi data transit dan proteksi kebocoran metadata. Kami menggunakan **Apache APISIX** untuk *TLS Termination* (mengubah HTTPS dari luar menjadi HTTP internal) dan memanipulasi header respons untuk menyembunyikan identitas server (*Server Signature Hiding*).
    *   **Layer 7 (Application):** Kebutuhan utama adalah pencegahan spam/DoS dan otorisasi hak akses. Kami menggunakan **Apache APISIX** (plugin *limit-count*) untuk rate limiting, **Apache Fortress LDAP** untuk otorisasi RBAC tersentralisasi, serta **Apache SkyWalking** & **Apache HertzBeat** untuk memantau anomali aplikasi.

### Soal 2: Mekanisme identifikasi, autentikasi, dan otorisasi akses dalam melindungi pengguna, data, API, dan perangkat.
*   **Jawaban Konten:**
    *   **Identifikasi:** Pengguna diidentifikasi melalui email unik yang tersimpan di database MySQL (untuk data aplikasi) dan disinkronkan ke direktori **OpenLDAP** melalui **Apache Fortress**.
    *   **Autentikasi:** Menggunakan mekanisme *Token-based Authentication*. Pengguna melakukan POST ke `/api/auth/login`. Jika kredensial cocok, aplikasi mengeluarkan cookie HTTP-Only berisi JWT token yang ditandatangani secara kriptografis (menggunakan library `jose`).
    *   **Otorisasi:** Diterapkan secara berlapis (*Defense in Depth*). Lapisan pertama berada pada middleware Next.js yang membaca JWT dan mencocokkan peran (*role*). Lapisan kedua berada di backend menggunakan otorisasi terpusat **Apache Fortress** yang menanyakan kebijakan akses (*permission mapping*) ke direktori LDAP. Hal ini mencegah *Broken Access Control* (BAC) secara mutlak.
    *   **Perlindungan Perangkat & API:** APISIX membatasi laju request (*Rate Limiting*) per perangkat berdasarkan alamat IP klien guna meredam serangan otomatis (*brute force*).

### Soal 3: Perbandingan arsitektur jaringan dan layanan sebelum vs sesudah kontrol keamanan diterapkan.
*   **Jawaban Konten:**
    *   **Sebelum Penerapan Kontrol (Kondisi Bypass / Port 3000):**
        *   Trafik berjalan di atas HTTP biasa tanpa enkripsi (rentan penyadapan/MITM).
        *   Tidak ada pembatasan request (rentan terhadap serangan *brute force* dan DoS).
        *   Identitas server Next.js terekspos jelas pada header respons (mempermudah pengintaian/reconnaissance oleh peretas).
        *   Keadaan kesehatan server database dan LDAP tidak terpantau secara real-time.
    *   **Sesudah Penerapan Kontrol (Kondisi Aman / Lewat APISIX Port 443):**
        *   Trafik terenkripsi penuh menggunakan SSL/TLS (mengamankan data sensitif pelaporan).
        *   Serangan brute force ditahan di gerbang luar oleh plugin rate limiting APISIX (mengembalikan kode HTTP 429).
        *   Header server dimanipulasi sehingga peretas tidak mengetahui teknologi backend yang digunakan.
        *   Kesehatan infrastruktur dipantau aktif oleh HertzBeat, sementara performa dan alur data internal direkam oleh SkyWalking untuk analisis pasca-insiden.

### Soal 4: Strategi mitigasi dan tata kelola keamanan jaringan untuk pengembangan sistem berikutnya.
*   **Jawaban Konten:**
    *   **Tata Kelola & Mitigasi Teknis Masa Depan:**
        1.  **Penerapan Web Application Firewall (WAF):** Mengaktifkan plugin integrasi WAF pada APISIX (seperti Coraza WAF) untuk mendeteksi ancaman OWASP Top 10 secara proaktif.
        2.  **Sertifikat SSL Komersial:** Mengganti sertifikat *self-signed* dengan sertifikat tepercaya (seperti Let's Encrypt) demi kepatuhan enkripsi penuh di peramban pengguna.
        3.  **Sistem Notifikasi Uptime Real-time:** Mengonfigurasi modul *Alerting* HertzBeat agar mengirimkan notifikasi kegagalan secara otomatis melalui Webhook ke grup Telegram atau Slack tim administrator.
        4.  **Multi-Factor Authentication (MFA):** Menambahkan lapisan autentikasi kedua (seperti kode OTP) untuk akun administrator melalui modul autentikasi tambahan.
        5.  **Audit Log Tersentralisasi:** Mengalirkan log dari APISIX dan Next.js ke server log terpusat (SIEM) untuk kepatuhan tata kelola audit keamanan informasi kampus.